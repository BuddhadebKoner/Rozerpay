import express from 'express';
import orderRouter from './src/routes/order.route.js';


const app = express();
app.use(express.json());
app.use('/', orderRouter);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});