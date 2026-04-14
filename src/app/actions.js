'use server'

import dbConnect from '@/lib/db';
import { Employee, Action, Vacation } from '@/models';
import { dateKey } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

export async function getEmployees() {
  await dbConnect();
  const emps = await Employee.find({}).sort({ id: 1 }).lean();
  return JSON.parse(JSON.stringify(emps));
}

export async function getInitialData(selectedDate) {
  await dbConnect();
  const dk = dateKey(selectedDate);
  const employees = await Employee.find({}).sort({ id: 1 }).lean();
  const actions = await Action.find({ dateKey: dk }).lean();
  const allVacations = await Vacation.find({}).lean();
  
  return {
    employees: JSON.parse(JSON.stringify(employees)),
    actions: JSON.parse(JSON.stringify(actions)),
    vacations: JSON.parse(JSON.stringify(allVacations))
  };
}

export async function addBookingAction(dk, seatId, empId, type) {
  await dbConnect();
  // Remove existing action for this user on this day
  await Action.deleteOne({ dateKey: dk, employeeId: empId, type });
  
  // If it's a book action, also remove any other booking for this seat on this day
  if (type === 'book') {
    await Action.deleteOne({ dateKey: dk, seatId });
  }

  await Action.create({ dateKey: dk, seatId, employeeId: empId, type });
  revalidatePath('/');
}

export async function removeBookingAction(dk, seatId, empId, type) {
  await dbConnect();
  await Action.deleteOne({ dateKey: dk, employeeId: empId, type });
  revalidatePath('/');
}

export async function saveVacation(vacData) {
  await dbConnect();
  await Vacation.create(vacData);
  revalidatePath('/');
}

export async function deleteVacation(id) {
  await dbConnect();
  await Vacation.deleteOne({ id });
  revalidatePath('/');
}
