import mongoose from 'mongoose';

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'acknowledged', 'in_progress', 'resolved', 'rejected'],
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  note: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const incidentSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  category: {
    type: String,
    enum: ['pothole', 'streetlight', 'garbage', 'flooding', 'safety', 'other'],
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  address: {
    type: String,
    trim: true
  },
  media: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['pending', 'acknowledged', 'in_progress', 'resolved', 'rejected'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  statusHistory: [statusHistorySchema]
}, {
  timestamps: true
});

incidentSchema.index({ location: '2dsphere' });

export default mongoose.model('Incident', incidentSchema);
