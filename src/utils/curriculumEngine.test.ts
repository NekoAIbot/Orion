import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getEducationLevelForClass,
  getClassesForLevel,
  mergeSchoolCurriculumOverlay,
  compareCurriculumVersions,
  calculateUpdatedMastery,
  identifySkillGaps,
  checkChemicalEquationBalance,
  calculateOhmAndPendulum,
} from './curriculumEngine';
import { BUILT_IN_TOPICS, INITIAL_STUDENT_MASTERY } from '../data/nigerianCurriculumData';

test('Education level and class hierarchy mapping covers Primary 1-6, JSS 1-3, SSS 1-3', () => {
  assert.equal(getEducationLevelForClass('Primary 1'), 'Primary');
  assert.equal(getEducationLevelForClass('Primary 6'), 'Primary');
  assert.equal(getEducationLevelForClass('JSS 2'), 'JSS');
  assert.equal(getEducationLevelForClass('SSS 3'), 'SSS');

  assert.equal(getClassesForLevel('Primary').length, 6);
  assert.equal(getClassesForLevel('JSS').length, 3);
  assert.equal(getClassesForLevel('SSS').length, 3);
});

test('mergeSchoolCurriculumOverlay combines school custom topics without mutating platform-wide curriculum', () => {
  const platformOnly = BUILT_IN_TOPICS.filter((t) => t.isPlatformWide);
  const schoolCustom = BUILT_IN_TOPICS.filter((t) => !t.isPlatformWide);

  const builtInResult = mergeSchoolCurriculumOverlay(platformOnly, schoolCustom, 'built_in', 'sch_unity_lagos_01');
  assert.equal(builtInResult.every((t) => t.isPlatformWide), true);

  const hybridResult = mergeSchoolCurriculumOverlay(platformOnly, schoolCustom, 'hybrid', 'sch_unity_lagos_01');
  assert.equal(hybridResult.length, platformOnly.length + schoolCustom.length);

  // Verify immutability: mutating returned topic does not overwrite BUILT_IN_TOPICS
  hybridResult[0].title = 'MUTATED_TITLE';
  assert.notEqual(BUILT_IN_TOPICS[0].title, 'MUTATED_TITLE');
});

test('compareCurriculumVersions accurately tracks unverified samples vs approved school overlay topics', () => {
  const platformOnly = BUILT_IN_TOPICS.filter((t) => t.isPlatformWide);
  const schoolCustom = BUILT_IN_TOPICS.filter((t) => !t.isPlatformWide);

  const diff = compareCurriculumVersions(platformOnly, schoolCustom, 'JSS 2');
  assert.equal(diff.platformTopicsCount, 2);
  assert.equal(diff.schoolCustomTopicsCount, 1);
  assert.equal(diff.approvedVerifiedCount, 1);
});

test('calculateUpdatedMastery rewards demonstrated understanding and classifies remedial vs mastered', () => {
  const m1 = calculateUpdatedMastery(50, 2, 95, false);
  assert.equal(m1.masteryScore, 77);
  assert.equal(m1.status, 'developing');

  const m2 = calculateUpdatedMastery(77, 3, 95, false);
  assert.equal(m2.masteryScore, 88);
  assert.equal(m2.status, 'mastered');
});

test('identifySkillGaps flags students below 65% mastery and links remedial curriculum topics', () => {
  const gaps = identifySkillGaps(INITIAL_STUDENT_MASTERY, BUILT_IN_TOPICS);
  assert.equal(gaps.length, 2);
  assert.equal(gaps[0].masteryRecord.skillTag, 'Mechanics: Work, Energy & Power');
  assert.equal(gaps[0].priority, 'High');
  assert.ok(gaps[0].recommendedTopic);
});

test('Virtual Discovery Lab chemical equation balancer and Physics calculators work accurately', () => {
  // N2 + 3H2 -> 2NH3 (2 N, 6 H on both sides)
  const balanced = checkChemicalEquationBalance({ N: 2, H: 6 }, { N: 2, H: 6 });
  assert.equal(balanced.isBalanced, true);

  const unbalanced = checkChemicalEquationBalance({ N: 2, H: 2 }, { N: 1, H: 3 });
  assert.equal(unbalanced.isBalanced, false);

  const phys = calculateOhmAndPendulum(12, 3, 1.0, 9.8);
  assert.equal(phys.currentAmps, 4);
  assert.equal(phys.powerWatts, 48);
  assert.equal(phys.pendulumPeriodSec, 2.01);
});
