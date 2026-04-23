import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import RecordVoice from './pages/RecordVoice'
import AddPhotos from './pages/AddPhotos'
import LabelPhotos from './pages/LabelPhotos'
import ReviewReport from './pages/ReviewReport'
import SendSave from './pages/SendSave'

export default function App() {
  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-offwhite relative">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/record" element={<RecordVoice />} />
        <Route path="/photos" element={<AddPhotos />} />
        <Route path="/label" element={<LabelPhotos />} />
        <Route path="/report" element={<ReviewReport />} />
        <Route path="/send" element={<SendSave />} />
      </Routes>
    </div>
  )
}
