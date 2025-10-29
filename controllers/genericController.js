// Generic CRUD controller factory
exports.createController = (Model) => {
  return {
    // Get all
    getAll: async (req, res) => {
      try {
        const queryObj = { ...req.query };
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        excludedFields.forEach(el => delete queryObj[el]);

        let query = Model.find(queryObj);

        // Populate references if specified
        if (req.query.populate) {
          const populateFields = req.query.populate.split(',').join(' ');
          query = query.populate(populateFields);
        }

        // Sorting
        if (req.query.sort) {
          const sortBy = req.query.sort.split(',').join(' ');
          query = query.sort(sortBy);
        } else {
          query = query.sort('-createdAt');
        }

        // Field limiting
        if (req.query.fields) {
          const fields = req.query.fields.split(',').join(' ');
          query = query.select(fields);
        }

        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await Model.countDocuments(queryObj);

        query = query.skip(startIndex).limit(limit);

        const results = await query;

        // Pagination result
        const pagination = {};
        if (endIndex < total) {
          pagination.next = { page: page + 1, limit };
        }
        if (startIndex > 0) {
          pagination.prev = { page: page - 1, limit };
        }

        res.status(200).json({
          success: true,
          count: results.length,
          total,
          pagination,
          data: results
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    },

    // Get single
    getOne: async (req, res) => {
      try {
        let query = Model.findById(req.params.id);

        if (req.query.populate) {
          const populateFields = req.query.populate.split(',').join(' ');
          query = query.populate(populateFields);
        }

        const doc = await query;

        if (!doc) {
          return res.status(404).json({
            success: false,
            message: 'Resource not found'
          });
        }

        res.status(200).json({
          success: true,
          data: doc
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    },

    // Create
    create: async (req, res) => {
      try {
        const doc = await Model.create(req.body);

        res.status(201).json({
          success: true,
          data: doc
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    },

    // Update
    update: async (req, res) => {
      try {
        const doc = await Model.findById(req.params.id);

        if (!doc) {
          return res.status(404).json({
            success: false,
            message: 'Resource not found'
          });
        }

        // Apply incoming updates using Mongoose document setters so that hooks run
        doc.set(req.body);

        // Ensure Mixed-type fields are marked as modified when provided
        if (req.body && typeof req.body === 'object') {
          Object.keys(req.body).forEach((key) => {
            const path = doc.schema?.path?.(key);
            if (path && path.instance === 'Mixed') {
              doc.markModified(key);
            }
          });
        }

        await doc.save();

        res.status(200).json({
          success: true,
          data: doc
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    },

    // Delete
    delete: async (req, res) => {
      try {
        const doc = await Model.findByIdAndDelete(req.params.id);

        if (!doc) {
          return res.status(404).json({
            success: false,
            message: 'Resource not found'
          });
        }

        res.status(200).json({
          success: true,
          data: {}
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    }
  };
};

