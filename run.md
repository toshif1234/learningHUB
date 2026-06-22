cd frontend
npm install
npm run dev

cd ..
cd backend 

myenv\Scripts\activate

python -m uvicorn main:app --host 0.0.0.0 --port 8000