// Adapted from https://github.com/nitinhepat/spa-without-framework

module.exports = class Router {

  constructor(routes, routeElement) {
      this.routes = routes;
      this.routeElement = document.getElementById(routeElement);
      this.initialize();
      this.hashChanged();
  }
  getPathAndRouteMapping() {
      const routeMapping = {};
      for (let objKey in this.routes) {
          routeMapping[this.routes[objKey].viewObj.path] = this.routes[objKey].viewObj.url;
      }
      return routeMapping;
  }
  initialize() {
      window.addEventListener('hashchange', (e) => {
          this.hashChanged()
      })
  }

  hashChanged() {
      const locationHash = window.location.hash;
      for (let i = 0; i < this.routes.length; i++) {
          const route = this.routes[i];
          if (route.isActiveRoute(locationHash.substr(1))) {
              this.navigate(route.viewObj.path)
          }
      }
  }

  navigate(path) {
      const pathRouteMapping = this.getPathAndRouteMapping();
      const url = pathRouteMapping[path];
      const xhttp = new XMLHttpRequest();
      let scope = this;
      xhttp.onreadystatechange = function() {
          if (this.readyState === 4 && this.status === 200) {
              scope.routeElement.innerHTML = this.responseText;
          }
      };
      xhttp.open('GET', url, true);
      xhttp.send();
  }

}