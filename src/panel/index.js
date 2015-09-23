import React from "react";
import ReactDOM from "react-dom";
import classNames from "classnames";
import update from "react-addons-update";

class Panel extends React.Component {
  constructor() {
    super();
    this.state = {
      app: null,
      installed: [],
      recent: [],
      didInit: false
    };
  }

  componentDidMount() {
    self.port.on("init", this.didInit.bind(this));
  }

  didInit(initial) {
    console.log("didInit", initial);
    this.setState({
      didInit: true,
      app: initial.app || null,
      installed: initial.installed || [],
      recent: initial.recent || []
    });
  }

  mapToInstalled(scope) {
    return this.state.installed.filter((app) => app.scope === scope)[0];
  }

  mapToRecent(scope) {
    return this.state.recent.filter((app) => app.scope === scope)[0];
  }

  render() {
    const {didInit, app, installed, recent} = this.state;
    const parts = [];
    if (!didInit) {
      parts.push(
        <article
          className="is-empty"
          key="empty">
          Loading …
        </article>
      );
    } else {
      if (app) {
        parts.push(
          <Install
            app={app}
            installed={!!this.mapToInstalled(app.scope)}
            key="app"
            onPin={this.handlePin.bind(this)}
            recent={recent}
          />
        );
      }
      parts.push(
        <LaunchPad
          installed={installed}
          key="installed"
          onLaunch={this.handleLaunch.bind(this)}
        />
      );
    }
    return (
      <main>
        {parts}
      </main>
    );
  }

  handlePin(app) {
    const installed = this.mapToInstalled(app.scope);
    if (installed) {
      self.port.emit("unpinApp", {
        scope: app.scope
      });
      this.setState(update(this.state, {
        installed: {
          $splice: [[this.state.installed.indexOf(installed), 1]]
        },
        recent: {
          $push: [installed]
        }
      }));
    } else {
      self.port.emit("pinApp", {
        scope: app.scope
      });
      const diff = {
        installed: {
          $push: [app]
        }
      };
      const recent = this.mapToRecent(app.scope);
      if (recent) {
        diff.recent = {
          $splice: [[this.state.installed.indexOf(recent), 1]]
        };
      }
      this.setState(update(this.state, diff));
    }
  }

  handleLaunch(app) {
    console.log("handleApp", app.scope);
    self.port.emit("launchApp", {
      scope: app.scope
    });
  }
}

class Install extends React.Component {
  render() {
    const {app, installed, recent} = this.props;
    const btnCls = classNames("app-action", "image-button", {
      "is-installed": installed
    });
    const host = app.scope.replace(/.*?\/\/(www\.)?|\/$/ig, "");

    let $recent = null;
    if (recent.length) {
      const apps = recent
        .filter((recentApp) => recentApp.scope !== app.scope)
        .map((recentApp) => {
          return (
            <li key={recentApp.scope} onClick={this.handleClick.bind(this, recentApp)}>
              <img className="app-name" height="60" src={recentApp.icon} />
            </li>
          );
        });
      $recent = (
        <ul className="icon-list">{apps}</ul>
      );
    } else {
      $recent = "Keep track of apps that you visited here!";
    }
    const clsRecent = classNames("recent", {
      "is-empty": recent.length > 0
    });

    return (
      <section className="pinnables">
        <div className="app" onClick={this.handleClick.bind(this, app)}>
          <img className="app-name" height="60" src={app.icon} />
          <div className="app-label">
            <span className="app-name">{app.name}</span>
            <span className="app-host">{host}</span>
          </div>
          <button className={btnCls}></button>
        </div>
        <div className={clsRecent}>
          <span className="label">Recent:</span>
          {$recent}
        </div>
      </section>
    );
  }

  handleClick(app) {
    this.props.onPin(app);
  }
}

Install.propTypes = {
  app: React.PropTypes.object,
  installed: React.PropTypes.bool,
  onPin: React.PropTypes.func,
  recent: React.PropTypes.array
};

class LaunchPad extends React.Component {
  render() {
    const {installed} = this.props;
    let $installed = null;
    if (!installed.length) {
      $installed = "Pin the web you want to keep!";
    } else {
      const apps = installed.map((app) => {
        return (
          <li key={app.scope} onClick={this.handleClick.bind(this, app)}>
            <img className="app-name" height="60" src={app.icon} />
          </li>
        );
      });
      $installed = (
        <ul className="icon-list">{apps}</ul>
      );
    }
    const clsInstalled = classNames("installed", {
      "is-empty": installed.length > 0
    });
    return (
      <article className="launchpad">
        <section className={clsInstalled}>{$installed}</section>
      </article>
    );
  }

  handleClick(app) {
    this.props.onLaunch(app);
  }
}

LaunchPad.propTypes = {
  installed: React.PropTypes.array,
  onLaunch: React.PropTypes.func
};

ReactDOM.render(<Panel />, document.querySelector("#container"));
