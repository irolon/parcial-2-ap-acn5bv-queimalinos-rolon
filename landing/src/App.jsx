import { Route, Routes } from 'react-router'
import { Layout } from '@/components/layout/Layout'
import Home from '@/pages/home/Home'
import Trainers from '@/pages/trainer/Trainers'
import Students from '@/pages/student/Students'
import AI from '@/pages/ai/AI'
import Why from '@/pages/why/Why'
import Plans from '@/pages/plans/Plans'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="entrenadores" element={<Trainers />} />
        <Route path="alumnos" element={<Students />} />
        <Route path="ia" element={<AI />} />
        <Route path="por-que" element={<Why />} />
        <Route path="planes" element={<Plans />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
