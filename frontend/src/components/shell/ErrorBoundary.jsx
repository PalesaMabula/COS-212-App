import { Component } from 'react';
import { Panel, Button } from '../ui/primitives';

/*
 * If one page breaks, show a message on that page instead of a blank app.
 * The sidebar and top bar keep working, so the student can go elsewhere.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Page error:', error, info.componentStack);
  }

  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Panel role="alert">
        <h1>Something went wrong on this page</h1>
        <p className="muted" style={{ margin: '8px 0 14px' }}>
          Your progress is safe. Try again, or pick another page from the menu.
        </p>
        <Button $variant="primary" onClick={() => this.setState({ error: null })}>
          Try again
        </Button>
      </Panel>
    );
  }
}
