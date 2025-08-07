# VCard QR Generator - Digital Visiting Card

A beautiful, modern web application that creates digital visiting cards with QR codes. Users can input their personal information, upload a profile picture, add social media links, and generate a scannable QR code containing all their contact details in vCard format.

## Features

### ✨ Personal Information
- **Full Name** (First Name + Last Name)
- **Job Title & Company**
- **Mobile Number** with validation
- **Email Address** with validation
- **Website URL**
- **Physical Address**

### 📷 Profile Picture
- **Drag & Drop** image upload
- **Click to browse** functionality
- **Image validation** (JPG, PNG, GIF)
- **File size limit** (5MB max)
- **Live preview** in visiting card

### 🌐 Social Media Integration
- **LinkedIn** profile link
- **Twitter** profile link
- **Facebook** profile link
- **Instagram** profile link
- **GitHub** profile link
- **YouTube** channel link

### 🎯 QR Code Generation
- **vCard format** QR code generation
- **High-quality** scannable codes
- **Error correction** level M
- **300x300px** resolution

### 💳 Digital Visiting Card Preview
- **Real-time preview** as you type
- **Beautiful card design** with profile picture
- **Social media icons** with brand colors
- **Professional layout**

### 📥 Download Options
- **Download QR Code** as PNG image
- **Download vCard file** (.vcf format)
- **Direct import** to phone contacts

## How to Use

1. **Open the Application**
   - Open `index.html` in any modern web browser
   - No installation or server setup required

2. **Fill Your Information**
   - Enter your personal details in the form
   - Upload a profile picture (optional but recommended)
   - Add your social media links

3. **Upload Profile Picture**
   - Click on the upload area or drag & drop an image
   - Supported formats: JPG, PNG, GIF (max 5MB)

4. **Preview Your Card**
   - See real-time preview as you type
   - Check how your visiting card will look

5. **Generate QR Code**
   - Click "Generate QR Code" button
   - Wait for the QR code to be created

6. **Download Your Files**
   - Download the QR code image
   - Download the vCard file for direct contact import

## Technical Details

### Technologies Used
- **HTML5** - Modern semantic markup
- **CSS3** - Beautiful responsive design with animations
- **JavaScript (ES6+)** - Interactive functionality
- **QRCode.js** - QR code generation library
- **Font Awesome** - Icons for social media and UI

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### File Structure
```
vcard-qr-generator/
├── index.html          # Main HTML file
├── styles.css          # CSS styles and animations
├── script.js           # JavaScript functionality
└── README.md          # Documentation
```

## Features in Detail

### Form Validation
- **Real-time validation** for email and phone numbers
- **Required field indicators** with asterisks
- **Visual feedback** with color-coded borders
- **Custom validation messages**

### Responsive Design
- **Mobile-first** approach
- **Tablet and desktop** optimized layouts
- **Touch-friendly** interface
- **Smooth animations** and transitions

### Accessibility
- **Keyboard navigation** support
- **Screen reader friendly** labels
- **High contrast** color scheme
- **Focus indicators** for all interactive elements

### Image Handling
- **Client-side processing** (no server required)
- **Base64 encoding** for vCard inclusion
- **Automatic resizing** and optimization
- **File type validation**

## Usage Examples

### Personal Use
- Create your own digital business card
- Share contact information easily
- Quick networking at events
- Social media profile sharing

### Business Use
- Employee contact cards
- Customer service representatives
- Sales team contact sharing
- Professional networking

### Event Use
- Conference networking
- Trade show contacts
- Meeting participants
- Workshop attendees

## Customization

The application can be easily customized:

### Colors and Styling
- Modify `styles.css` to change the color scheme
- Update gradients, fonts, and spacing
- Customize button styles and animations

### Additional Fields
- Add more input fields in `index.html`
- Update the `getFormData()` function in `script.js`
- Modify the vCard generation logic

### Social Media Platforms
- Add more social platforms in the form
- Update the social links generation function
- Include platform-specific validation

## Security & Privacy

- **Client-side only** - No data sent to external servers
- **Local processing** - All operations happen in your browser
- **No data storage** - Information is not saved anywhere
- **Privacy-first** - Your data stays on your device

## Browser Support Notes

- **Local file access** may be limited in some browsers
- **HTTPS recommended** for production deployment
- **Modern browser features** required for full functionality

## Troubleshooting

### QR Code Not Generating
- Check internet connection (for QRCode.js library)
- Ensure all required fields are filled
- Try refreshing the page

### Image Upload Issues
- Check file size (must be under 5MB)
- Verify file format (JPG, PNG, or GIF)
- Try a different image file

### Download Not Working
- Enable downloads in browser settings
- Check if popup blocker is interfering
- Try using a different browser

## Contributing

This is a standalone web application. To contribute:
1. Fork the project
2. Make your improvements
3. Test thoroughly across browsers
4. Submit a pull request

## License

This project is open source and available under the MIT License.

---

**Enjoy creating your digital visiting cards! 🎉**