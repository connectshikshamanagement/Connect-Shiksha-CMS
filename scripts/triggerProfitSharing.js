const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import models
const Income = require('../models/Income');
const { computeProfitSharing } = require('../utils/profitSharing');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

const triggerProfitSharing = async () => {
  try {
    console.log('🔄 Triggering profit sharing for existing income records...');

    // Find all income records that haven't been processed for profit sharing
    const incomes = await Income.find({ 
      profitShared: { $ne: true },
      amount: { $gt: 0 }
    });

    console.log(`📊 Found ${incomes.length} income records to process`);

    if (incomes.length === 0) {
      console.log('ℹ️ No income records found to process');
      return;
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const income of incomes) {
      try {
        console.log(`Processing income: ${income.sourceType} - ₹${income.amount}`);
        await computeProfitSharing(income);
        processedCount++;
        console.log(`✅ Processed: ${income.sourceType} - ₹${income.amount}`);
      } catch (error) {
        console.error(`❌ Error processing income ${income._id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Processing Summary:');
    console.log(`✅ Successfully processed: ${processedCount} income records`);
    console.log(`❌ Errors: ${errorCount} income records`);
    console.log(`📊 Total income records: ${incomes.length}`);

    // Show current payout summary
    const Payout = require('../models/Payout');
    const payouts = await Payout.find({}).populate('userId', 'name');
    
    console.log('\n💰 Current Payouts:');
    if (payouts.length === 0) {
      console.log('   No payouts found');
    } else {
      payouts.forEach(payout => {
        console.log(`   ${payout.userId?.name}: ₹${payout.netAmount} (${payout.shares?.length || 0} shares)`);
      });
    }

  } catch (error) {
    console.error('❌ Error triggering profit sharing:', error);
  } finally {
    mongoose.connection.close();
  }
};

triggerProfitSharing();
