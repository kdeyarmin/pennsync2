import PDFSearchInterface from "../components/documents/PDFSearchInterface";

export default function PDFSearch() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">PDF Search</h1>
        <p className="text-gray-600">
          Search within all indexed PDF documents with fuzzy matching and advanced filters
        </p>
      </div>

      <PDFSearchInterface />
    </div>
  );
}