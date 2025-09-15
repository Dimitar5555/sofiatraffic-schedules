describe('routes', () => {
    test('should have unique route_ref for each type', () => {
        const data = require('../data/routes.json');
        const routes_set = new Set();
        data.forEach(route => {
            const route_id = `${route.type}-${route.route_ref}`;
            expect(routes_set.has(route_id))
            .toBe(false, `Duplicate route_ref ${route.route_ref} for type ${route.type}`);
            routes_set.add(route_id);
        });
    });
});
