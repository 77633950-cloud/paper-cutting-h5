import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './fonts.css'
// 书法字体分片包（unicode-range 按需加载，不影响首屏）
import 'cn-fontsource-fz-jia-gu-wen-regular/font.css'
import '@chinese-fonts/ysbzt/dist/峄山碑篆体/result.css'
import '@chinese-fonts/zkxw/dist/站酷小薇LOGO体_猫啃网/result.css'
import '@chinese-fonts/rzjkxzdmh/dist/nzgrKangxi/result.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
