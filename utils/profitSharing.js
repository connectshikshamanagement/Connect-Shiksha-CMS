const ProfitSharingRule = require('../models/ProfitSharingRule');
const Payout = require('../models/Payout');
const User = require('../models/User');
const Team = require('../models/Team');
const Income = require('../models/Income');

// Compute profit sharing based on income
exports.computeProfitSharing = async (income) => {
  try {
    // Find applicable rule
    const rule = await ProfitSharingRule.findOne({
      appliesTo: income.sourceType,
      active: true
    });

    if (!rule) {
      console.log(`No profit sharing rule found for ${income.sourceType}`);
      return;
    }

    const profitAmount = income.amount;
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    // Process each distribution
    for (const dist of rule.distribution) {
      const shareAmount = (profitAmount * dist.percentage) / 100;

      if (dist.recipientType === 'user') {
        // Direct user payout
        await this.addToPayout(dist.recipientId, month, year, {
          sourceType: income.sourceType,
          sourceId: income._id,
          amount: shareAmount,
          percentage: dist.percentage,
          description: dist.description || `${dist.percentage}% share from ${income.sourceType}`
        });
      } else if (dist.recipientType === 'role') {
        // Find all users with this role
        const users = await User.find({
          roleIds: { $elemMatch: { $exists: true } },
          active: true
        }).populate('roleIds');

        const usersWithRole = users.filter(user =>
          user.roleIds.some(role => role.key === dist.recipientId)
        );

        if (usersWithRole.length > 0) {
          const sharePerUser = shareAmount / usersWithRole.length;
          
          for (const user of usersWithRole) {
            await this.addToPayout(user._id.toString(), month, year, {
              sourceType: income.sourceType,
              sourceId: income._id,
              amount: sharePerUser,
              percentage: dist.percentage / usersWithRole.length,
              description: `${dist.percentage}% role share from ${income.sourceType} (${dist.recipientId})`
            });
          }
        }
      } else if (dist.recipientType === 'team') {
        // Find team members and distribute
        const team = await Team.findById(dist.recipientId).populate('members');
        
        if (team && team.members.length > 0) {
          const sharePerMember = shareAmount / team.members.length;
          
          for (const member of team.members) {
            await this.addToPayout(member._id.toString(), month, year, {
              sourceType: income.sourceType,
              sourceId: income._id,
              amount: sharePerMember,
              percentage: dist.percentage / team.members.length,
              description: `${dist.percentage}% team share from ${income.sourceType} (${team.name})`
            });
          }
        }
      }
      // 'pool' type would be retained by company - no individual payouts
    }

    // Mark income as profit shared
    await Income.findByIdAndUpdate(income._id, { profitShared: true });

  } catch (error) {
    console.error('Error computing profit sharing:', error);
    throw error;
  }
};

// Add or update payout for a user
exports.addToPayout = async (userId, month, year, shareDetail) => {
  try {
    // Find existing payout or create new
    let payout = await Payout.findOne({ userId, month, year });

    if (payout) {
      // Add to existing payout
      payout.shares.push(shareDetail);
      await payout.save(); // This will trigger pre-save to recalculate totals
    } else {
      // Get user's base salary
      const user = await User.findById(userId);
      
      // Create new payout
      payout = await Payout.create({
        userId,
        month,
        year,
        baseSalary: user.salary || 0,
        shares: [shareDetail],
        status: 'pending'
      });
    }

    return payout;
  } catch (error) {
    console.error('Error adding to payout:', error);
    throw error;
  }
};

