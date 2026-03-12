import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const isAdminUser = (user) => user?.role === 'admin' || user?.account_type === 'agency_admin' || user?.account_type === 'super_admin';

const normalizeHeader = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const cleanValue = (value) => String(value || '').replace(/\uFEFF/g, '').trim();
const cleanPhone = (value) => cleanValue(value).replace(/[^0-9]/g, '');

function parseCSV(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(value);
      if (row.some((cell) => String(cell || '').trim() !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }

  row.push(value);
  if (row.some((cell) => String(cell || '').trim() !== '')) rows.push(row);
  return rows;
}

function titleCase(text) {
  return cleanValue(text)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatProviderName(rawName) {
  const name = cleanValue(rawName);
  if (!name) return '';
  if (name.includes(',')) {
    const [last, first] = name.split(',');
    return `${titleCase(first)} ${titleCase(last)}`.replace(/\s+/g, ' ').trim();
  }
  return titleCase(name);
}

async function processInChunks(items, handler, chunkSize = 25) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await Promise.all(chunk.map(handler));
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!isAdminUser(user)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { file_url } = await req.json();
    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    const response = await fetch(file_url);
    if (!response.ok) {
      return Response.json({ error: 'Unable to download CSV file' }, { status: 400 });
    }

    const text = await response.text();
    const parsedRows = parseCSV(text);
    if (parsedRows.length < 2) {
      return Response.json({ error: 'CSV file is empty' }, { status: 400 });
    }

    const headers = parsedRows[0].map(normalizeHeader);
    const rows = parsedRows.slice(1);
    const columnIndex = (name) => headers.findIndex((header) => header === name);
    const getCell = (row, name) => {
      const index = columnIndex(name);
      return index === -1 ? '' : cleanValue(row[index]);
    };

    const existingProviders = await base44.asServiceRole.entities.Physician.list('-updated_date', 5000);
    const existingFaxContacts = await base44.asServiceRole.entities.FaxContact.list('-updated_date', 5000);

    const providerMap = new Map();
    for (const provider of existingProviders) {
      const key = cleanValue(provider.npi_number) || `${cleanValue(provider.full_name).toLowerCase()}|${cleanPhone(provider.fax_number)}`;
      if (key) providerMap.set(key, provider);
    }

    const faxContactMap = new Map();
    for (const contact of existingFaxContacts) {
      const key = `${cleanValue(contact.name).toLowerCase()}|${cleanPhone(contact.fax_number)}`;
      if (key) faxContactMap.set(key, contact);
    }

    const providerCreates = [];
    const providerUpdates = [];
    const faxCreates = [];
    const faxUpdates = [];
    const seenProviderKeys = new Set();
    const seenContactKeys = new Set();
    let skippedRows = 0;

    for (const row of rows) {
      const full_name = formatProviderName(getCell(row, 'physician_name'));
      const credentials = getCell(row, 'title');
      const fax_number = cleanPhone(getCell(row, 'fax_number'));
      const phone_number = cleanPhone(getCell(row, 'work_number'));
      const npi_number = cleanValue(getCell(row, 'npi'));

      if (!full_name || !fax_number) {
        skippedRows += 1;
        continue;
      }

      const providerKey = npi_number || `${full_name.toLowerCase()}|${fax_number}`;
      if (seenProviderKeys.has(providerKey)) continue;
      seenProviderKeys.add(providerKey);

      const specialty = getCell(row, 'specialty');
      const practice_name = getCell(row, 'primary_organization_name');

      const providerPayload = {
        full_name,
        credentials,
        provider_type: credentials,
        specialty: specialty || '',
        practice_name: practice_name || '',
        company: getCell(row, 'company'),
        top_unit: getCell(row, 'top_unit'),
        parent_unit: getCell(row, 'parent_unit'),
        sub_unit: getCell(row, 'sub_unit'),
        phone_number,
        fax_number,
        npi_number,
        state_license: getCell(row, 'state_license'),
        preferred_contact_method: 'fax',
        is_active: true,
        accepts_home_health: true,
        notes: 'Imported from provider CSV'
      };

      const existingProvider = providerMap.get(providerKey);
      if (existingProvider) {
        providerUpdates.push({ id: existingProvider.id, data: providerPayload });
      } else {
        providerCreates.push(providerPayload);
      }

      const contactPayload = {
        name: `${full_name}${credentials ? `, ${credentials}` : ''}`,
        organization: practice_name || getCell(row, 'company') || '',
        fax_number,
        notes: specialty ? `Imported provider • ${specialty}` : 'Imported provider'
      };
      const contactKey = `${contactPayload.name.toLowerCase()}|${fax_number}`;
      if (!seenContactKeys.has(contactKey)) {
        seenContactKeys.add(contactKey);
        const existingContact = faxContactMap.get(contactKey);
        if (existingContact) {
          faxUpdates.push({ id: existingContact.id, data: contactPayload });
        } else {
          faxCreates.push(contactPayload);
        }
      }
    }

    await processInChunks(providerCreates, (item) => base44.asServiceRole.entities.Physician.create(item));
    await processInChunks(providerUpdates, (item) => base44.asServiceRole.entities.Physician.update(item.id, item.data));
    await processInChunks(faxCreates, (item) => base44.asServiceRole.entities.FaxContact.create(item));
    await processInChunks(faxUpdates, (item) => base44.asServiceRole.entities.FaxContact.update(item.id, item.data));

    return Response.json({
      success: true,
      created_providers: providerCreates.length,
      updated_providers: providerUpdates.length,
      created_fax_contacts: faxCreates.length,
      updated_fax_contacts: faxUpdates.length,
      skipped_rows: skippedRows
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});