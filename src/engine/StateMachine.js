export class StateMachine {
  constructor(initialState = "INIT") {
    this.state = initialState;
    this.listeners = new Set();
  }

  set(nextState, payload = {}) {
    const previous = this.state;
    this.state = nextState;
    for (const listener of this.listeners) {
      listener({ previous, current: nextState, payload });
    }
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  is(...states) {
    return states.includes(this.state);
  }
}
