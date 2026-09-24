import { Component } from "react";
import { reportError } from "../utils/errorReporting.js";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch() {
    reportError('render_error');
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="hp-crash">
        <div className="hp-crash__card">
          <h1>Something went wrong</h1>
          <p>Sorry — this page hit an unexpected error. Reloading usually fixes it.</p>
          <div className="hp-crash__actions">
            <button type="button" className="hp-btn hp-btn--primary" onClick={() => window.location.reload()}>
              Reload the page
            </button>
            <a className="hp-crash__link" href="/">Go to the homepage</a>
          </div>
        </div>
      </div>
    );
  }
}
