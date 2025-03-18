import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Organization from '../models/Organization';
import User from '../models/User';
import Customer from '../models/Customer';
import Deal from '../models/Deal';
import Task from '../models/Task';
import CustomField from '../models/CustomField';
import logger from '../config/logger';

// Load env variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI as string);

// Seed data function
const seedData = async () => {
  try {
    // Clean existing data
    await Organization.deleteMany({});
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Deal.deleteMany({});
    await Task.deleteMany({});
    await CustomField.deleteMany({});

    logger.info('Previous data cleaned');

    // Create organization
    const organization = await Organization.create({
      name: 'Demo Company',
      domain: 'democompany.com',
      plan: 'pro',
      settings: {
        theme: 'light',
        modules: {
          customers: true,
          deals: true,
          tasks: true,
          reports: true,
        },
      },
    });

    logger.info(`Organization created: ${organization.name}`);

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@democompany.com',
      password: 'password123',
      role: 'admin',
      organization: organization._id,
    });

    logger.info(`Admin user created: ${adminUser.email}`);

    // Create normal user
    const normalUser = await User.create({
      name: 'Normal User',
      email: 'user@democompany.com',
      password: 'password123',
      role: 'user',
      organization: organization._id,
    });

    logger.info(`Normal user created: ${normalUser.email}`);

    // Create customers
    const customers = [];
    const customerTypes = ['lead', 'prospect', 'customer', 'churned'];
    const customerNames = [
      'Acme Corp',
      'TechStars Inc',
      'Global Solutions',
      'Bright Future',
      'Innovative Systems',
      'Summit Partners',
      'Horizon Technologies',
      'Eagle Enterprises',
      'Pinnacle Group',
      'Central Services',
    ];

    for (let i = 0; i < 20; i++) {
      const typeIndex = Math.floor(Math.random() * 4);
      const nameIndex = i % 10;

      const customer = await Customer.create({
        name: `${customerNames[nameIndex]} ${i + 1}`,
        email: `contact${i + 1}@example.com`,
        phone: `+1-555-${100 + i}-${1000 + i}`,
        company: customerNames[nameIndex],
        type: customerTypes[typeIndex],
        status: 'active',
        source: i % 3 === 0 ? 'website' : i % 3 === 1 ? 'referral' : 'direct',
        assignedTo: i % 2 === 0 ? adminUser._id : normalUser._id,
        organization: organization._id,
        notes: `Sample customer ${i + 1} notes here`,
        customFields: {
          industry:
            i % 4 === 0
              ? 'Technology'
              : i % 4 === 1
              ? 'Finance'
              : i % 4 === 2
              ? 'Healthcare'
              : 'Retail',
          size: i % 3 === 0 ? 'Small' : i % 3 === 1 ? 'Medium' : 'Large',
        },
      });

      customers.push(customer);
    }

    logger.info(`${customers.length} customers created`);

    // Create deals
    const deals = [];
    const dealStages = [
      'lead',
      'qualified',
      'proposal',
      'negotiation',
      'closed-won',
      'closed-lost',
    ];
    const dealValues = [1000, 2500, 5000, 10000, 25000, 50000];

    for (let i = 0; i < 15; i++) {
      const stageIndex = Math.floor(Math.random() * 6);
      const valueIndex = Math.floor(Math.random() * 6);
      const customerIndex = Math.floor(Math.random() * customers.length);

      // Generate random probability based on stage
      let probability = 0;
      switch (dealStages[stageIndex]) {
        case 'lead':
          probability = 10;
          break;
        case 'qualified':
          probability = 30;
          break;
        case 'proposal':
          probability = 50;
          break;
        case 'negotiation':
          probability = 70;
          break;
        case 'closed-won':
          probability = 100;
          break;
        case 'closed-lost':
          probability = 0;
          break;
      }

      const deal = await Deal.create({
        title: `Deal for ${customers[customerIndex].name}`,
        customer: customers[customerIndex]._id,
        value: dealValues[valueIndex],
        currency: 'USD',
        stage: dealStages[stageIndex],
        status: dealStages[stageIndex].includes('closed') ? 'inactive' : 'active',
        probability: probability,
        expectedCloseDate: new Date(Date.now() + Math.random() * 7776000000), // Random date within 90 days
        assignedTo: i % 2 === 0 ? adminUser._id : normalUser._id,
        organization: organization._id,
        products: [
          {
            name: 'Product A',
            price: dealValues[valueIndex] / 2,
            quantity: 2,
          },
        ],
        notes: `Sample deal ${i + 1} notes here`,
        activities: [
          {
            type: 'note',
            description: 'Deal created',
            date: new Date(),
            user: i % 2 === 0 ? adminUser._id : normalUser._id,
          },
        ],
        customFields: {
          priority: i % 3 === 0 ? 'High' : i % 3 === 1 ? 'Medium' : 'Low',
          source: i % 2 === 0 ? 'Inbound' : 'Outbound',
        },
      });

      deals.push(deal);
    }

    logger.info(`${deals.length} deals created`);

    // Create tasks
    const tasks = [];
    const taskPriorities = ['low', 'medium', 'high'];
    const taskStatuses = ['pending', 'in_progress', 'completed', 'canceled'];

    for (let i = 0; i < 25; i++) {
      const priorityIndex = Math.floor(Math.random() * 3);
      const statusIndex = Math.floor(Math.random() * 4);

      // Set related entity (customer or deal)
      let relatedTo = null;
      if (i % 3 === 0 && customers.length > 0) {
        const customerIndex = Math.floor(Math.random() * customers.length);
        relatedTo = {
          model: 'Customer',
          id: customers[customerIndex]._id,
        };
      } else if (i % 3 === 1 && deals.length > 0) {
        const dealIndex = Math.floor(Math.random() * deals.length);
        relatedTo = {
          model: 'Deal',
          id: deals[dealIndex]._id,
        };
      }

      // Set dates
      const dueDate = new Date(Date.now() + Math.random() * 604800000); // Random date within 7 days
      let completedDate = null;
      let completedBy = null;

      if (taskStatuses[statusIndex] === 'completed') {
        completedDate = new Date();
        completedBy = i % 2 === 0 ? adminUser._id : normalUser._id;
      }

      const task = await Task.create({
        title: `Task ${i + 1}: ${i % 2 === 0 ? 'Follow up' : 'Review'} ${
          i % 3 === 0 ? 'call' : i % 3 === 1 ? 'meeting' : 'proposal'
        }`,
        description: `Sample task ${i + 1} description here`,
        dueDate,
        priority: taskPriorities[priorityIndex],
        status: taskStatuses[statusIndex],
        assignedTo: i % 2 === 0 ? adminUser._id : normalUser._id,
        organization: organization._id,
        relatedTo,
        reminderDate: new Date(dueDate.getTime() - 86400000), // 1 day before due date
        completedDate,
        completedBy,
        createdBy: i % 2 === 0 ? adminUser._id : normalUser._id,
      });

      tasks.push(task);
    }

    logger.info(`${tasks.length} tasks created`);

    // Create custom fields
    const customFields = [
      {
        name: 'industry',
        label: 'Industry',
        type: 'dropdown',
        entity: 'customer',
        required: false,
        options: [
          'Technology',
          'Finance',
          'Healthcare',
          'Retail',
          'Manufacturing',
          'Education',
          'Other',
        ],
        organization: organization._id,
      },
      {
        name: 'size',
        label: 'Company Size',
        type: 'dropdown',
        entity: 'customer',
        required: false,
        options: ['Small', 'Medium', 'Large', 'Enterprise'],
        organization: organization._id,
      },
      {
        name: 'website',
        label: 'Website',
        type: 'url',
        entity: 'customer',
        required: false,
        organization: organization._id,
      },
      {
        name: 'priority',
        label: 'Priority',
        type: 'dropdown',
        entity: 'deal',
        required: false,
        options: ['Low', 'Medium', 'High'],
        organization: organization._id,
      },
      {
        name: 'source',
        label: 'Lead Source',
        type: 'dropdown',
        entity: 'deal',
        required: false,
        options: ['Inbound', 'Outbound', 'Partner', 'Referral'],
        organization: organization._id,
      },
    ];

    for (const field of customFields) {
      await CustomField.create(field);
    }

    logger.info(`${customFields.length} custom fields created`);

    logger.info('Data seeding completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error(`Error seeding data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
};

// Run the seeder
seedData();
