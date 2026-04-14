import mongoose from 'mongoose';

const EmployeeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  squadId: { type: Number, required: true },
  squadName: { type: String, required: true },
  batch: { type: Number, required: true },
  seatIndex: { type: Number, required: true },
}, { timestamps: true });

const ActionSchema = new mongoose.Schema({
  dateKey: { type: String, required: true },
  seatId: { type: String, required: true },
  employeeId: { type: String, required: true },
  type: { type: String, enum: ['book', 'release'], required: true },
  timestamp: { type: Number, default: Date.now },
}, { timestamps: true });

const VacationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  leaveType: { type: String, required: true },
  isPenalty: { type: Boolean, default: false },
  createdAt: { type: Number, default: Date.now },
}, { timestamps: true });

export const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);
export const Action = mongoose.models.Action || mongoose.model('Action', ActionSchema);
export const Vacation = mongoose.models.Vacation || mongoose.model('Vacation', VacationSchema);
