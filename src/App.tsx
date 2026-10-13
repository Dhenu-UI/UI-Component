import { Button } from './components/Button'

export default function App() {
  return (
    <div className="container">
      <h1>UI Components</h1>

      <section className="card">
        <h2>Button</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button variant="secondary" size="large">Primary</Button>
        </div>
      </section>
    </div>
  )
}
