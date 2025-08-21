// Currency Service for LinQrius
class CurrencyService {
    constructor() {
        // Exchange rates (you can update these or fetch from an API)
        this.exchangeRates = {
            USD: 1,
            INR: 75, // 1 USD = 75 INR (approximate)
            EUR: 0.85,
            GBP: 0.73
        };

        // Currency symbols and formatting
        this.currencyInfo = {
            USD: {
                symbol: '$',
                position: 'before',
                decimalPlaces: 2,
                thousandsSeparator: ',',
                decimalSeparator: '.'
            },
            INR: {
                symbol: '₹',
                position: 'before',
                decimalPlaces: 2,
                thousandsSeparator: ',',
                decimalSeparator: '.'
            },
            EUR: {
                symbol: '€',
                position: 'before',
                decimalPlaces: 2,
                thousandsSeparator: '.',
                decimalSeparator: ','
            },
            GBP: {
                symbol: '£',
                position: 'before',
                decimalPlaces: 2,
                thousandsSeparator: ',',
                decimalSeparator: '.'
            }
        };
    }

    // Detect currency based on country
    detectCurrency(country) {
        if (!country) return 'USD';
        
        const countryCurrencyMap = {
            'IN': 'INR',
            'US': 'USD',
            'GB': 'GBP',
            'DE': 'EUR',
            'FR': 'EUR',
            'IT': 'EUR',
            'ES': 'EUR',
            'CA': 'USD',
            'AU': 'USD',
            'JP': 'JPY'
        };

        return countryCurrencyMap[country] || 'USD';
    }

    // Convert amount between currencies
    convertCurrency(amount, fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) return amount;
        
        const fromRate = this.exchangeRates[fromCurrency];
        const toRate = this.exchangeRates[toCurrency];
        
        if (!fromRate || !toRate) return amount;
        
        // Convert to USD first, then to target currency
        const usdAmount = amount / fromRate;
        return usdAmount * toRate;
    }

    // Format price for display
    formatPrice(amount, currency = 'USD', options = {}) {
        const currencyData = this.currencyInfo[currency];
        if (!currencyData) {
            return `${amount} ${currency}`;
        }

        const {
            symbol,
            position,
            decimalPlaces,
            thousandsSeparator,
            decimalSeparator
        } = currencyData;

        // Format number with proper separators
        let formattedNumber = this.formatNumber(
            amount,
            decimalPlaces,
            thousandsSeparator,
            decimalSeparator
        );

        // Add currency symbol
        if (position === 'before') {
            return `${symbol}${formattedNumber}`;
        } else {
            return `${formattedNumber} ${symbol}`;
        }
    }

    // Format number with separators
    formatNumber(number, decimalPlaces, thousandsSeparator, decimalSeparator) {
        const num = parseFloat(number);
        if (isNaN(num)) return '0';

        // Convert to string with fixed decimal places
        let numStr = num.toFixed(decimalPlaces);
        
        // Split into integer and decimal parts
        const parts = numStr.split('.');
        let integerPart = parts[0];
        const decimalPart = parts[1];

        // Add thousands separators to integer part
        if (thousandsSeparator) {
            integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
        }

        // Combine parts
        if (decimalPart && decimalPart !== '00') {
            return `${integerPart}${decimalSeparator}${decimalPart}`;
        } else {
            return integerPart;
        }
    }

    // Get pricing for different plans in specified currency
    getPlanPricing(currency = 'USD') {
        const basePricing = {
            monthly: 2.99,
            yearly: 29.99,
            lifetime: 99.99
        };

        if (currency === 'USD') {
            return {
                monthly: this.formatPrice(basePricing.monthly, 'USD'),
                yearly: this.formatPrice(basePricing.yearly, 'USD'),
                lifetime: this.formatPrice(basePricing.lifetime, 'USD'),
                monthlyValue: basePricing.monthly,
                yearlyValue: basePricing.yearly,
                lifetimeValue: basePricing.lifetime
            };
        }

        // Convert to other currencies
        const convertedPricing = {};
        Object.keys(basePricing).forEach(plan => {
            const convertedAmount = this.convertCurrency(basePricing[plan], 'USD', currency);
            convertedPricing[plan] = this.formatPrice(convertedAmount, currency);
            convertedPricing[`${plan}Value`] = convertedAmount;
        });

        return convertedPricing;
    }

    // Get currency information for display
    getCurrencyInfo(currency) {
        return this.currencyInfo[currency] || this.currencyInfo.USD;
    }

    // Update exchange rates (can be called periodically or from API)
    updateExchangeRates(newRates) {
        this.exchangeRates = { ...this.exchangeRates, ...newRates };
    }

    // Get all supported currencies
    getSupportedCurrencies() {
        return Object.keys(this.currencyInfo).map(code => ({
            code,
            name: this.getCurrencyName(code),
            symbol: this.currencyInfo[code].symbol
        }));
    }

    // Get currency name
    getCurrencyName(code) {
        const names = {
            'USD': 'US Dollar',
            'INR': 'Indian Rupee',
            'EUR': 'Euro',
            'GBP': 'British Pound'
        };
        return names[code] || code;
    }

    // Format price range (e.g., "$10 - $20")
    formatPriceRange(minAmount, maxAmount, currency = 'USD') {
        const minFormatted = this.formatPrice(minAmount, currency);
        const maxFormatted = this.formatPrice(maxAmount, currency);
        return `${minFormatted} - ${maxFormatted}`;
    }

    // Format percentage discount
    formatDiscount(originalPrice, discountedPrice, currency = 'USD') {
        const discount = originalPrice - discountedPrice;
        const discountPercentage = (discount / originalPrice) * 100;
        
        return {
            percentage: Math.round(discountPercentage),
            amount: this.formatPrice(discount, currency),
            original: this.formatPrice(originalPrice, currency),
            discounted: this.formatPrice(discountedPrice, currency)
        };
    }

    // Get currency-aware pricing display
    getPricingDisplay(currency, plan) {
        const pricing = this.getPlanPricing(currency);
        
        if (plan === 'monthly') {
            return {
                price: pricing.monthly,
                period: currency === 'INR' ? 'महीना' : 'month',
                savings: null
            };
        } else if (plan === 'yearly') {
            const monthlyEquivalent = pricing.yearlyValue / 12;
            const monthlyPrice = this.formatPrice(monthlyEquivalent, currency);
            const savings = this.formatDiscount(pricing.monthlyValue * 12, pricing.yearlyValue, currency);
            
            return {
                price: pricing.yearly,
                period: currency === 'INR' ? 'साल' : 'year',
                monthlyEquivalent: monthlyPrice,
                savings: savings.percentage
            };
        }
        
        return {
            price: pricing[plan] || 'N/A',
            period: 'N/A',
            savings: null
        };
    }
}

module.exports = CurrencyService;
