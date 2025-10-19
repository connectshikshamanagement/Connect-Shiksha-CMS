const express = require('express');
const { createController } = require('../controllers/genericController');
const Project = require('../models/Project');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const projectController = createController(Project);

router.use(protect);

// Custom GET route to include budget utilization data
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('teamId', 'name')
      .populate('ownerId', 'name email')
      .populate('projectMembers', 'name email');

    // Calculate budget utilization for each project
    const projectsWithBudget = await Promise.all(
      projects.map(async (project) => {
        const expenses = await Expense.find({ projectId: project._id });
        const incomes = await Income.find({ 
          sourceRefId: project._id, 
          sourceRefModel: 'Project' 
        });

        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

        return {
          ...project.toObject(),
          totalExpense: totalExpenses,
          totalIncome: totalIncome,
          budgetUtilization: project.budget > 0 ? Math.round((totalExpenses / project.budget) * 100) : 0,
          dealCollection: project.totalDealAmount > 0 ? Math.round((totalIncome / project.totalDealAmount) * 100) : 0
        };
      })
    );

    res.json({
      success: true,
      data: projectsWithBudget
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router
  .route('/')
  .post(authorize('projects.create'), projectController.create);

router
  .route('/:id')
  .get(projectController.getOne)
  .put(authorize('projects.update'), projectController.update)
  .delete(authorize('projects.delete'), projectController.delete);

module.exports = router;

