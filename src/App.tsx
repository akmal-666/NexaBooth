import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import FrameList from './pages/FrameList'
import FrameDetail from './pages/FrameDetail'
import Payment from './pages/Payment'
import Capture from './pages/Capture'
import Preview from './pages/Preview'
import PrintPage from './pages/Print'
import Gallery from './pages/Gallery'
import Admin from './pages/Admin'
import Kiosk from './pages/Kiosk'
import Slideshow from './pages/Slideshow'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="frames" element={<FrameList />} />
          <Route path="frames/:id" element={<FrameDetail />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="admin" element={<Admin />} />
        </Route>

        {/* Full-screen flows without bottom nav */}
        <Route path="payment/:sessionId" element={<Payment />} />
        <Route path="capture/:sessionId" element={<Capture />} />
        <Route path="preview/:sessionId" element={<Preview />} />
        <Route path="print/:sessionId" element={<PrintPage />} />

        {/* Standalone fullscreen modes */}
        <Route path="kiosk" element={<Kiosk />} />
        <Route path="slideshow" element={<Slideshow />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
