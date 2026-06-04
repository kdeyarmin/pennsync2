import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import VitalSignsComparison from './VitalSignsComparison';

// Regression tests for the clinical-safety fix: vitals are interpreted against a
// normal RANGE, so a rising temperature / heart rate / respiratory rate must NOT
// be labelled "improved". (The previous monotonic `lowerIsBetter` model showed a
// fever spike as a green "improved".)

// Render a single vital comparison and return its card's trend label.
const trendFor = (label, current, previous) => {
  render(
    <VitalSignsComparison currentVitals={current} previousVitals={previous} />
  );
  const labelNode = screen.getByText(label);
  // The trend word ("improved"/"worsened"/"stable") lives in the same card.
  const card = labelNode.closest('div.bg-white');
  return card;
};

describe('VitalSignsComparison trend labelling', () => {
  it('renders nothing without previous vitals', () => {
    const { container } = render(
      <VitalSignsComparison currentVitals={{ temperature: 99 }} previousVitals={{}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('labels a rising temperature into fever as worsened, not improved', () => {
    const card = trendFor('Temperature', { temperature: 102 }, { temperature: 98.6 });
    expect(within(card).getByText('worsened')).toBeInTheDocument();
    expect(within(card).queryByText('improved')).toBeNull();
  });

  it('labels a fever resolving toward normal as improved', () => {
    const card = trendFor('Temperature', { temperature: 98.6 }, { temperature: 102 });
    expect(within(card).getByText('improved')).toBeInTheDocument();
  });

  it('labels a rising heart rate into tachycardia as worsened', () => {
    const card = trendFor('Heart Rate', { heart_rate: 120 }, { heart_rate: 80 });
    expect(within(card).getByText('worsened')).toBeInTheDocument();
  });

  it('labels rising O2 saturation toward normal as improved', () => {
    const card = trendFor('O2 Saturation', { oxygen_saturation: 97 }, { oxygen_saturation: 92 });
    expect(within(card).getByText('improved')).toBeInTheDocument();
  });

  it('labels decreasing pain as improved', () => {
    const card = trendFor('Pain Level', { pain_level: 2 }, { pain_level: 6 });
    expect(within(card).getByText('improved')).toBeInTheDocument();
  });

  it('labels an unchanged reading as stable', () => {
    const card = trendFor('Heart Rate', { heart_rate: 72 }, { heart_rate: 72 });
    expect(within(card).getByText('stable')).toBeInTheDocument();
  });

  it('treats rising systolic blood pressure as worsened', () => {
    const card = trendFor(
      'BP Systolic',
      { blood_pressure_systolic: 150 },
      { blood_pressure_systolic: 118 }
    );
    expect(within(card).getByText('worsened')).toBeInTheDocument();
  });
});
