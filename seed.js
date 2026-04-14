import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/seatsync';

const EmployeeSchema = new mongoose.Schema({
  id: String,
  name: String,
  squadId: Number,
  squadName: String,
  batch: Number,
  seatIndex: Number,
});

const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);

const SQUAD_DATA = [
    { id: 1, name: 'Alpha', batch: 1 }, { id: 2, name: 'Beta', batch: 1 },
    { id: 3, name: 'Gamma', batch: 1 }, { id: 4, name: 'Delta', batch: 1 },
    { id: 5, name: 'Epsilon', batch: 1 }, { id: 6, name: 'Zeta', batch: 2 },
    { id: 7, name: 'Eta', batch: 2 }, { id: 8, name: 'Theta', batch: 2 },
    { id: 9, name: 'Iota', batch: 2 }, { id: 10, name: 'Kappa', batch: 2 },
];

const EMPLOYEE_NAMES = [
    ['Shivam Sharma','Priya Patel','Rohan Gupta','Sneha Reddy','Vikram Singh','Ananya Joshi','Karthik Nair','Meera Iyer'],
    ['Arjun Kumar','Divya Banerjee','Ishaan Malhotra','Kavya Rao','Nikhil Verma','Pooja Choudhury','Rahul Menon','Sana Khan'],
    ['Aditya Mishra','Bhavna Desai','Chirag Thakur','Diya Hegde','Gaurav Pandey','Harini Suresh','Jai Kapoor','Lakshmi Prasad'],
    ['Amit Tiwari','Deepa Kulkarni','Farhan Qureshi','Geeta Yadav','Harsh Srivastava','Isha Bhatt','Kunal Saxena','Mansi Agarwal'],
    ['Abhishek Das','Chitra Naik','Dev Bose','Fatima Syed','Girish Rathore','Hema Pillai','Jasmin Fernandes','Kiran Shetty'],
    ['Manoj Chauhan','Neha Goswami','Om Rajput','Pallavi Jain','Rajesh Dubey','Shilpa Mehta','Tushar Biswas','Uma Devi'],
    ['Ajay Rawat','Bharat Sethi','Chandan Mohan','Damini Khatri','Gaurav Dhawan','Heena Sheikh','Ivan DSouza','Jyoti Bhat'],
    ['Akash Arora','Bindu Chawla','Dhanush Murthy','Ekta Saini','Faisal Ansari','Gauri Kadam','Hemant Roy','Indira Nambiar'],
    ['Animesh Ghosh','Brij Tandon','Charu Bhargava','Dev Prakash','Ela More','Firoz Pathan','Gitanjali Sen','Himanshu Tyagi'],
    ['Ashwin Pai','Bhumika Purohit','Chiranjeev Rana','Durga Vyas','Eshwar Iyengar','Falguni Trivedi','Ganesh Mistry','Hansa Parikh'],
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  await Employee.deleteMany({});
  console.log('Cleared existing employees');

  const employees = [];
  SQUAD_DATA.forEach((squad, si) => {
    EMPLOYEE_NAMES[si].forEach((name, mi) => {
      employees.push({
        id: `E${si * 8 + mi + 1}`,
        name,
        squadId: squad.id,
        squadName: squad.name,
        batch: squad.batch,
        seatIndex: mi
      });
    });
  });

  await Employee.insertMany(employees);
  console.log(`Seeded ${employees.length} employees`);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

seed().catch(console.error);
