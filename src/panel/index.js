import React from "react";
import ReactDOM from "react-dom";

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      pinnable: null,
      app: null,
      installed: [],
      didInit: false
    };
  }

  componentDidMount() {
    self.port.on("init", this.didInit.bind(this));
  }

  didInit(initial) {
    this.setState({
      didInit: true,
      pinnable: initial.pinnable || null,
      app: initial.app || null,
      installed: initial.installed || []
    });
  }

  render() {
    const {didInit, pinnable, installed} = this.state;
    const parts = [];
    if (!didInit) {
      parts.push(
        <article className="is-empty">Loading …</article>
      );
    } else {
      if (pinnable) {
        parts.push(
          <Pinnable app={pinnable} />
        );
      }
      parts.push(
        <Installed installed={installed} />
      );
    }
    return (
      <main>
        {parts}
      </main>
    );
  }
}

class Pinnable extends React.Component {
  render() {
    const {app} = this.props;
    return (
      <aside className="pinnable">
        <img className="pinnable-name" height="60" src={app.icon} />
        <div className="pinnable-label">
          <span className="pinnable-name">{app.name}</span>
          <span className="pinnable-host">{app.host}</span>
        </div>
        <button className="pinnable-action image-button"></button>
      </aside>
    );
  }
}

Pinnable.propTypes = {
  app: React.PropTypes.object
};

class Installed extends React.Component {
  render() {
    return (
      <article className="installed is-empty">
        Pin the web you want to keep!
      </article>
    );
  }
}

ReactDOM.render(<App />, document.body);
