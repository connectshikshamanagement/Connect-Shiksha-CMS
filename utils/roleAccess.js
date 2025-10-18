// Simple role-based access helpers

const FOUNDER_KEY = 'FOUNDER';

// Map roles to allowed income sources
// Adjust as your organization evolves
const ROLE_TO_INCOME_SOURCES = {
  FOUNDER: ['*'],
  COACHING_MANAGER: ['Coaching'],
  INNOVATION_LEAD: [],
  MEDIA_MANAGER: [],
  MENTOR: [],
};

// Map roles to allowed expense business units
const ROLE_TO_EXPENSE_UNITS = {
  FOUNDER: ['*'],
  COACHING_MANAGER: ['Coaching'],
  INNOVATION_LEAD: ['IOT', 'Robotics'],
  MEDIA_MANAGER: ['Media'],
  MENTOR: [],
};

function isFounder(user) {
  return (user.roleIds || []).some((r) => r.key === FOUNDER_KEY);
}

function unique(list) {
  return Array.from(new Set(list));
}

function getAllowedIncomeSources(user) {
  const byRoles = (user.roleIds || []).flatMap((r) => ROLE_TO_INCOME_SOURCES[r.key] || []);
  return unique(byRoles);
}

function getAllowedExpenseUnits(user) {
  const byRoles = (user.roleIds || []).flatMap((r) => ROLE_TO_EXPENSE_UNITS[r.key] || []);
  return unique(byRoles);
}

function isAllowedValue(allowedList, value) {
  if (!allowedList || allowedList.length === 0) return false;
  if (allowedList.includes('*')) return true;
  return allowedList.includes(value);
}

module.exports = {
  isFounder,
  getAllowedIncomeSources,
  getAllowedExpenseUnits,
  isAllowedValue,
};



