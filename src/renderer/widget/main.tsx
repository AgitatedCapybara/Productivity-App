import ReactDOM from 'react-dom/client'
import { StrictMode } from 'react'
import { Widget } from './Widget'
import '../src/index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Widget />
  </StrictMode>
)
