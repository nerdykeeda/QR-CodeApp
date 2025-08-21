// Analytics Service for LinQrius
const geoip = require('geoip-lite');
const { v4: uuidv4 } = require('uuid');

class AnalyticsService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    // Detect user location and currency
    detectUserLocation(req) {
        try {
            const ip = this.getClientIP(req);
            const geo = geoip.lookup(ip);
            
            if (!geo) {
                return {
                    country: 'US',
                    city: 'Unknown',
                    timezone: 'America/New_York',
                    currency: 'USD'
                };
            }

            // Determine currency based on country
            let currency = 'USD';
            if (geo.country === 'IN') {
                currency = 'INR';
            } else if (geo.country === 'GB') {
                currency = 'GBP';
            } else if (geo.country === 'EU') {
                currency = 'EUR';
            }

            return {
                country: geo.country,
                city: geo.city || 'Unknown',
                timezone: geo.timezone || 'UTC',
                currency: currency,
                ip: ip
            };
        } catch (error) {
            console.error('Error detecting user location:', error);
            return {
                country: 'US',
                city: 'Unknown',
                timezone: 'America/New_York',
                currency: 'USD',
                ip: '0.0.0.0'
            };
        }
    }

    // Get client IP address
    getClientIP(req) {
        return req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               req.ip ||
               '127.0.0.1';
    }

    // Generate or get session ID
    getSessionId(req) {
        let sessionId = req.cookies?.linqrius_session;
        
        if (!sessionId) {
            sessionId = uuidv4();
            // Set cookie in response (will be set by middleware)
            req.newSessionId = sessionId;
        }
        
        return sessionId;
    }

    // Track visitor session
    async trackVisitorSession(req, res) {
        try {
            const sessionId = this.getSessionId(req);
            const location = this.detectUserLocation(req);
            const userAgent = req.headers['user-agent'] || 'Unknown';
            const referrer = req.headers.referer || req.headers.referrer || '';

            // Check if session already exists
            const { data: existingSession } = await this.supabase
                .from('visitor_sessions')
                .select('*')
                .eq('session_id', sessionId)
                .single();

            if (existingSession) {
                // Update existing session
                await this.supabase
                    .from('visitor_sessions')
                    .update({
                        last_visit: new Date().toISOString(),
                        ip_address: location.ip,
                        country: location.country,
                        city: location.city,
                        timezone: location.timezone,
                        currency: location.currency,
                        user_agent: userAgent,
                        referrer: referrer
                    })
                    .eq('session_id', sessionId);
            } else {
                // Create new session
                await this.supabase
                    .from('visitor_sessions')
                    .insert({
                        session_id: sessionId,
                        ip_address: location.ip,
                        country: location.country,
                        city: location.city,
                        timezone: location.timezone,
                        currency: location.currency,
                        user_agent: userAgent,
                        referrer: referrer,
                        first_visit: new Date().toISOString(),
                        last_visit: new Date().toISOString(),
                        visit_count: 1
                    });
            }

            // Set session cookie if it's new
            if (req.newSessionId) {
                res.cookie('linqrius_session', sessionId, {
                    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax'
                });
            }

            // Update app analytics
            await this.updateAppAnalytics(location.country, location.currency);

            return {
                sessionId,
                location,
                currency: location.currency
            };
        } catch (error) {
            console.error('Error tracking visitor session:', error);
            return {
                sessionId: 'error',
                location: { country: 'US', currency: 'USD' },
                currency: 'USD'
            };
        }
    }

    // Track page view
    async trackPageView(sessionId, pageUrl, featureUsed = null, durationSeconds = null) {
        try {
            await this.supabase
                .from('page_views')
                .insert({
                    session_id: sessionId,
                    page_url: pageUrl,
                    feature_used: featureUsed,
                    duration_seconds: durationSeconds,
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('Error tracking page view:', error);
        }
    }

    // Update app analytics
    async updateAppAnalytics(country, currency) {
        try {
            // Update total visitors
            const { data: visitorCount } = await this.supabase
                .from('app_analytics')
                .select('metric_value')
                .eq('metric_name', 'total_visitors')
                .single();

            const newCount = (visitorCount?.metric_value || 0) + 1;
            
            await this.supabase
                .from('app_analytics')
                .upsert({
                    metric_name: 'total_visitors',
                    metric_value: newCount,
                    last_updated: new Date().toISOString()
                });

            // Update country distribution
            const { data: countryData } = await this.supabase
                .from('app_analytics')
                .select('metric_value')
                .eq('metric_name', 'popular_countries')
                .single();

            let countries = countryData?.metric_value || [];
            const countryIndex = countries.findIndex(c => c.country === country);
            
            if (countryIndex >= 0) {
                countries[countryIndex].count += 1;
            } else {
                countries.push({ country, count: 1 });
            }

            await this.supabase
                .from('app_analytics')
                .upsert({
                    metric_name: 'popular_countries',
                    metric_value: countries,
                    last_updated: new Date().toISOString()
                });

            // Update currency distribution
            const { data: currencyData } = await this.supabase
                .from('app_analytics')
                .select('metric_value')
                .eq('metric_name', 'currency_distribution')
                .single();

            let currencies = currencyData?.metric_value || { USD: 0, INR: 0 };
            currencies[currency] = (currencies[currency] || 0) + 1;

            await this.supabase
                .from('app_analytics')
                .upsert({
                    metric_name: 'currency_distribution',
                    metric_value: currencies,
                    last_updated: new Date().toISOString()
                });

        } catch (error) {
            console.error('Error updating app analytics:', error);
        }
    }

    // Get analytics dashboard data
    async getAnalyticsDashboard() {
        try {
            const { data: metrics } = await this.supabase
                .from('app_analytics')
                .select('*');

            const { data: recentVisitors } = await this.supabase
                .from('visitor_sessions')
                .select('*')
                .order('last_visit', { ascending: false })
                .limit(10);

            const { data: topCountries } = await this.supabase
                .from('visitor_sessions')
                .select('country, city')
                .order('created_at', { ascending: false })
                .limit(100);

            // Count by country
            const countryCounts = {};
            topCountries.forEach(visitor => {
                const key = visitor.country;
                countryCounts[key] = (countryCounts[key] || 0) + 1;
            });

            const sortedCountries = Object.entries(countryCounts)
                .map(([country, count]) => ({ country, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            return {
                metrics: metrics || [],
                recentVisitors: recentVisitors || [],
                topCountries: sortedCountries,
                totalSessions: recentVisitors?.length || 0
            };
        } catch (error) {
            console.error('Error getting analytics dashboard:', error);
            return {
                metrics: [],
                recentVisitors: [],
                topCountries: [],
                totalSessions: 0
            };
        }
    }

    // Get user-specific analytics
    async getUserAnalytics(userId) {
        try {
            const { data: userLinks } = await this.supabase
                .from('user_links')
                .select('*')
                .eq('user_id', userId);

            const { data: userProfile } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            const totalClicks = userLinks?.reduce((sum, link) => sum + (link.clicks || 0), 0) || 0;
            const totalLinks = userLinks?.length || 0;

            return {
                totalLinks,
                totalClicks,
                averageClicks: totalLinks > 0 ? Math.round(totalClicks / totalLinks) : 0,
                userProfile,
                recentLinks: userLinks?.slice(0, 5) || []
            };
        } catch (error) {
            console.error('Error getting user analytics:', error);
            return {
                totalLinks: 0,
                totalClicks: 0,
                averageClicks: 0,
                userProfile: null,
                recentLinks: []
            };
        }
    }
}

module.exports = AnalyticsService;
