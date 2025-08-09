exports.apiRequired = 12
exports.version = 1.0
exports.description = "Real-time monitoring for HFS-Monitor"
exports.beforePlugin = "admin"
exports.repo = "pavelnil/hfs-monitor-agent"
exports.preview = ["https://github.com/pavelnil/HFS-Monitor/blob/main/screenshots/screenshot.jpg?raw=true","https://github.com/pavelnil/HFS-Monitor/blob/main/screenshots/themesheet.jpg?raw=true"]

let lastTotalIn = 0;
let lastTotalOut = 0;
let currentSpeedIn = 0;
let currentSpeedOut = 0;
let logEnabled = false;

exports.init = (api) => {
    const log = (message) => {
        if (logEnabled) api.log(`[HFS-Monitor] ${message}`);
    };

    const calculateTraffic = () => {
        try {
            const start = Date.now();
            const conns = api.getConnections();
            let totalIn = 0;
            let totalOut = 0;

            for (const conn of conns) {
                if (conn.socket) {
                    totalIn += conn.socket.bytesRead || 0;
                    totalOut += conn.socket.bytesWritten || 0;
                }
            }

            const now = Date.now();
            const timeDiff = (now - (lastUpdate || now)) / 1000;
            lastUpdate = now;

            if (timeDiff <= 0) return;

            const diffIn = Math.max(0, totalIn - lastTotalIn);
            const diffOut = Math.max(0, totalOut - lastTotalOut);
            
            lastTotalIn = totalIn;
            lastTotalOut = totalOut;

            currentSpeedIn = diffIn / 1048576 / timeDiff;
            currentSpeedOut = diffOut / 1048576 / timeDiff;

            log(`Traffic: In=${currentSpeedIn.toFixed(2)} MB/s, Out=${currentSpeedOut.toFixed(2)} MB/s (${Date.now() - start}ms)`);
        } catch (e) {
            log(`Traffic calculation error: ${e}`);
        }
    };

    let lastUpdate = Date.now();
    const trafficInterval = setInterval(calculateTraffic, 5000);

    const cleanup = () => {
        clearInterval(trafficInterval);
    };

    const getConnectionSpeed = (conn) => {
        if (!conn.socket) return 0;
        const bytes = (conn.socket.bytesWritten || 0) + (conn.socket.bytesRead || 0);
        const duration = (Date.now() - (conn.started || conn.timestamp || Date.now())) / 1000;
        return duration > 0 ? bytes / duration : 0;
    };

    const requireLocalhostForPlugin = (ctx) => {
        const pluginEndpoints = [
            '/current-connections',
            '/current-traffic',
            '/block-connection'
        ];
        
        if (!pluginEndpoints.includes(ctx.path)) return true;
        
        const allowedIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
        if (allowedIPs.includes(ctx.ip)) return true;
        
        ctx.status = 403;
        ctx.body = { error: "Access forbidden. Plugin requires localhost connection." };
        log(`Blocked external plugin access from IP: ${ctx.ip} to ${ctx.path}`);
        return false;
    };

    exports.middleware = async (ctx) => {
        try {
            if (!requireLocalhostForPlugin(ctx)) return;
            
            if (['/current-connections', '/current-traffic', '/block-connection'].includes(ctx.path)) {
                log(`Plugin request: ${ctx.method} ${ctx.path} from ${ctx.ip}`);
            }
            
            if (ctx.path === '/current-connections') {
                const conns = api.getConnections().map(conn => ({
                    ip: conn.ip,
                    user: conn.account?.username || (conn.ctx?.state?.account?.username) || 'Anonymous',
                    started: new Date(conn.started || conn.timestamp || Date.now()),
                    sent: conn.socket?.bytesWritten || 0,
                    received: conn.socket?.bytesRead || 0,
                    userAgent: conn.userAgent,
                    id: conn.id,
                    file: conn.ctx?.request?.url || conn.request?.url || 'N/A',
                    speed: getConnectionSpeed(conn)
                }));
                
                ctx.body = conns;
                return;
            }
            
            if (ctx.path === '/current-traffic') {
                ctx.body = {
                    in: currentSpeedIn,
                    out: currentSpeedOut
                };
                return;
            }
            
            if (ctx.path === '/block-connection' && ctx.method === 'POST') {
                if (ctx.headers['content-type']?.includes('application/json')) {
                    const body = await new Promise((resolve, reject) => {
                        let data = '';
                        ctx.req.on('data', chunk => data += chunk);
                        ctx.req.on('end', () => resolve(data));
                        ctx.req.on('error', reject);
                    });
                    
                    ctx.request.body = JSON.parse(body);
                }
                
                const { ip, reason } = ctx.request.body || {};
                
                if (!ip) {
                    ctx.status = 400;
                    ctx.body = { error: "IP required" };
                    log("Block request: Missing IP");
                    return;
                }
                
                const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}|(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
                if (!ipRegex.test(ip)) {
                    ctx.status = 400;
                    ctx.body = { error: "Invalid IP format" };
                    log(`Invalid IP format: ${ip}`);
                    return;
                }
                
                api.addBlock({ ip, comment: "Blocked by HFS-Monitor" || reason });
                ctx.body = { success: true };
                log(`Blocked IP: ${ip}, reason: ${reason || "No reason provided"}`);
            }
        } catch (e) {
            log(`Middleware error: ${e.message}`);
            ctx.status = 500;
            ctx.body = { error: "Internal server error" };
        }
    };

    log("Plugin initialized. Endpoints restricted to localhost.");
    return { unload: cleanup };
};
