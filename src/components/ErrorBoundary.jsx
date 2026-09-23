import { Component } from "react";

// Catches a render error anywhere below it and shows a recovery screen instead
// of the blank white page React leaves when a component throws.
//
// This is not error *monitoring* — nothing is reported anywhere, so a crash
// here is still invisible to us unless the visitor says something. It only
// stops a single bad render from taking the whole site down for them. Wiring a
// reporter (Sentry or similar) into componentDidCatch below is the follow-up;
// it needs an account and a DSN, which is why it is not done here.
//
// A class, because error boundaries have no hook equivalent — componentDidCatch
// and getDerivedStateFromError only exist on class components.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Logged rather than swallowed: without this the stack is lost entirely,
    // and the console is the only place it can currently go.
    console.error("Unhandled render error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="hp-crash">
        <div className="hp-crash__card">
          <h1>Something went wrong</h1>
          <p>Sorry — this page hit an unexpected error. Reloading usually fixes it.</p>
          <div className="hp-crash__actions">
            <button
              type="button"
              className="hp-btn hp-btn--primary"
              onClick={() => window.location.reload()}
            >
              Reload the page
            </button>
            {/* A full navigation, not a router link: the router is part of what
                may have just failed, so re-rendering into it could throw again. */}
            <a className="hp-crash__link" href="/">Go to the homepage</a>
          </div>
        </div>
      </div>
    );
  }
}
