/**
 * Simple Router for LIFF SPA
 */

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.init();
    }
    
    init() {
        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());
        
        // Listen for popstate (back/forward)
        window.addEventListener('popstate', () => this.handleRoute());
        
        // Handle initial load
        this.handleRoute();
    }
    
    register(path, handler) {
        this.routes.set(path, handler);
    }
    
    navigate(path, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const hash = queryString ? `#${path}?${queryString}` : `#${path}`;
        window.location.hash = hash;
    }
    
    back() {
        window.history.back();
    }
    
    getParams() {
        const hash = window.location.hash;
        const [, queryString] = hash.split('?');
        return new URLSearchParams(queryString || '');
    }
    
    getCurrentPath() {
        const hash = window.location.hash || '#/';
        const [path] = hash.split('?');
        return path;
    }
    
    async handleRoute() {
        const path = this.getCurrentPath();
        const handler = this.routes.get(path);
        
        if (handler) {
            try {
                await handler();
            } catch (error) {
                console.error('Route handler error:', error);
            }
        } else {
            // Default route
            this.navigate('/');
        }
    }
}

// Base View Class
class BaseView {
    constructor() {
        this.container = document.getElementById('app-container');
    }
    
    async init() {
        // Override in subclasses
    }
    
    cleanup() {
        // Override in subclasses
    }
    
    render(html) {
        this.container.innerHTML = html;
    }
    
    showLoading() {
        document.getElementById('loading').style.display = 'flex';
    }
    
    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }
    
    async getUserRole() {
        if (window.appState.userRole) {
            return window.appState.userRole;
        }
        
        try {
            const response = await fetch(`${window.WAREHOUSE_API_URL}?action=getUserRole&lineUserId=${window.appState.userProfile.userId}`);
            const data = await response.json();
            
            if (data.success) {
                window.appState.userRole = data.role;
                return data.role;
            }
        } catch (error) {
            console.error('Error getting user role:', error);
        }
        
        return 'requester';
    }
}

// Initialize router instance
window.router = new Router();