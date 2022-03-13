// Adapted from https://github.com/nitinhepat/spa-without-framework
module.exports = class Routes {
  constructor(viewObj, isDefaultRoute) {
      this.viewObj = viewObj;
      this.isDefaultRoute = isDefaultRoute;
  }
  isActiveRoute(hashPath) {
      return hashPath.replace('#', '') === this.viewObj.path
  }
}