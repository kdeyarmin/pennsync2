import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateDemographics,
  aggregateTopDiagnoses,
  aggregateFunctionalScores,
  aggregatePaymentTrends,
  computeSummaryStats,
} from "./oasisAnalytics.js";

const u = (over = {}) => ({ pdgm_data: {}, ...over });

test("aggregateDemographics classifies gender and age ranges", () => {
  const { gender, age } = aggregateDemographics([
    u({ pdgm_data: { patient_info: { gender: "Male", dob: "1950-01-01" } } }), // ~75-84
    u({ pdgm_data: { patient_info: { gender: "female", dob: "2020-01-01" } } }), // 0-64
    u({ pdgm_data: { patient_info: { gender: "", dob: "Not found" } } }), // unknown both
  ]);
  const g = Object.fromEntries(gender.map((x) => [x.name, x.value]));
  assert.equal(g.Male, 1);
  assert.equal(g.Female, 1);
  assert.equal(g.Unknown, 1);
  const a = Object.fromEntries(age.map((x) => [x.name, x.value]));
  assert.equal(a["0-64"], 1);
  assert.equal(a.Unknown, 1);
  assert.equal(a["75-84"], 1);
});

test("aggregateTopDiagnoses counts, sorts, limits, and filters placeholders", () => {
  const rows = aggregateTopDiagnoses(
    [
      u({ pdgm_data: { primary_diagnosis: "CHF" } }),
      u({ pdgm_data: { primary_diagnosis: "CHF" } }),
      u({ pdgm_data: { primary_diagnosis: "COPD" } }),
      u({ pdgm_data: { primary_diagnosis: "Unknown" } }),
      u({ pdgm_data: { primary_diagnosis: "Not found" } }),
    ],
    1,
  );
  assert.equal(rows.length, 1); // limit
  assert.deepEqual(rows[0], { name: "CHF", count: 2 }); // most frequent first
});

test("aggregateFunctionalScores filters, orders oldest->newest, slices, maps fields", () => {
  const rows = aggregateFunctionalScores(
    [
      u({ assessment_date: "2026-03-01", patient_name: "Bob", pdgm_data: { functional_scores: { m1860_ambulation: 3 } } }),
      u({ assessment_date: "2026-01-01", patient_name: "Amy", pdgm_data: { functional_scores: { m1850_transferring: 2 } } }),
      u({ assessment_date: null, pdgm_data: { functional_scores: { m1830_bathing: 1 } } }), // filtered (no date)
      u({ assessment_date: "2026-02-01", patient_name: "Cy" }), // filtered (no functional_scores)
    ],
    20,
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].patient, "Amy"); // oldest first
  assert.equal(rows[0].transferring, 2);
  assert.equal(rows[1].ambulation, 3);
  assert.equal(rows[1].bathing, 0); // default
});

test("aggregatePaymentTrends keeps only rows with date + payment", () => {
  const rows = aggregatePaymentTrends([
    u({ assessment_date: "2026-01-01", estimated_payment: 100, patient_name: "Amy" }),
    u({ assessment_date: "2026-02-01" }), // no payment
    u({ estimated_payment: 200 }), // no date
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].payment, 100);
});

test("computeSummaryStats handles populated and empty inputs", () => {
  const stats = computeSummaryStats([
    u({ scores: { overall: 80 }, estimated_payment: 1000 }),
    u({ scores: { overall: 90 }, estimated_payment: 3000 }),
  ]);
  assert.equal(stats.totalAssessments, 2);
  assert.equal(stats.avgScore, 85);
  assert.equal(stats.avgPayment, 2000);
  assert.equal(stats.totalRevenue, 4000);

  const empty = computeSummaryStats([]);
  assert.deepEqual(empty, { totalAssessments: 0, avgScore: 0, avgPayment: 0, totalRevenue: 0 });
});
