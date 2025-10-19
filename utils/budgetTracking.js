const Project = require('../models/Project');
const Expense = require('../models/Expense');
const Income = require('../models/Income');

// Get budget warnings for all projects
exports.getBudgetWarnings = async () => {
  try {
    const projects = await Project.find({ budget: { $gt: 0 } });
    const warnings = [];

    for (const project of projects) {
      // Get total expenses for this project
      const expenses = await Expense.find({ projectId: project._id });
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      // Get total income for this project
      const incomes = await Income.find({ 
        sourceRefId: project._id, 
        sourceRefModel: 'Project' 
      });
      const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
      
      // Calculate budget utilization
      const budgetUtilization = (totalExpenses / project.budget) * 100;
      
      // Calculate deal amount collection
      const dealCollection = project.totalDealAmount > 0 
        ? (totalIncome / project.totalDealAmount) * 100 
        : 0;

      // Determine warning level
      let warningLevel = 'none';
      let message = '';
      
      if (budgetUtilization > 100) {
        warningLevel = 'critical';
        message = `Project "${project.title}" has exceeded budget by ₹${(totalExpenses - project.budget).toLocaleString()}`;
      } else if (budgetUtilization > 80) {
        warningLevel = 'warning';
        message = `Project "${project.title}" is at ${Math.round(budgetUtilization)}% of budget`;
      }

      warnings.push({
        projectId: project._id,
        projectTitle: project.title,
        budget: project.budget,
        totalExpenses,
        totalIncome,
        dealAmount: project.totalDealAmount,
        budgetUtilization: Math.round(budgetUtilization),
        dealCollection: Math.round(dealCollection),
        warningLevel,
        message
      });
    }

    return warnings;
  } catch (error) {
    console.error('Error getting budget warnings:', error);
    throw error;
  }
};

// Get project financial summary
exports.getProjectFinancialSummary = async (projectId) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) return null;

    const expenses = await Expense.find({ projectId });
    const incomes = await Income.find({ 
      sourceRefId: projectId, 
      sourceRefModel: 'Project' 
    });

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
    
    const budgetUtilization = project.budget > 0 
      ? (totalExpenses / project.budget) * 100 
      : 0;
    
    const dealCollection = project.totalDealAmount > 0 
      ? (totalIncome / project.totalDealAmount) * 100 
      : 0;

    return {
      project: {
        _id: project._id,
        title: project.title,
        budget: project.budget,
        totalDealAmount: project.totalDealAmount
      },
      financials: {
        totalIncome,
        totalExpenses,
        profit: totalIncome - totalExpenses,
        budgetUtilization: Math.round(budgetUtilization),
        dealCollection: Math.round(dealCollection)
      },
      warnings: {
        budgetExceeded: budgetUtilization > 100,
        budgetWarning: budgetUtilization > 80 && budgetUtilization <= 100,
        dealComplete: dealCollection >= 100
      }
    };
  } catch (error) {
    console.error('Error getting project financial summary:', error);
    throw error;
  }
};
