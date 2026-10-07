# NLP Research Component - Heat Networks

A local-only NLP research component for exploring French heat networks data using natural language processing concepts.

## Status
- **Backend**: Not ready yet (as requested)
- **Data Source**: Local JSON file (`../reseaux_chaleur.json`)
- **Frontend**: Pure HTML/CSS/JavaScript (no dependencies)

## Quick Start

### Prerequisites
- The file `reseaux_chaleur.json` must be in the parent directory (`Builderz07/`)
- A modern web browser (Chrome, Firefox, Edge, Safari)

### Running the Component

1. **Simple method**: Just open `index.html` in your browser
   ```bash
   # On Windows
   start nlp_component\index.html
   
   # On Mac/Linux
   open nlp_component/index.html
   ```

2. **Using a local server** (recommended for full functionality):
   ```bash
   # Using Python
   cd Builderz07
   python -m http.server 8000
   
   # Then open: http://localhost:8000/nlp_component/
   
   # Using Node.js (npx)
   cd Builderz07
   npx serve .
   # Then open: http://localhost:3000/nlp_component/
   ```

## Features

### Search Capabilities
- **Natural Language Search**: Type keywords to search across all network fields
- **Multi-criteria Filtering**: Filter by region, confidence level, and titulaire type
- **Flexible Sorting**: Sort by opportunity score, deadline proximity, or name

### Data Display
- **Card-based UI**: Clean, responsive card layout for each network
- **Visual Indicators**: Color-coded confidence badges
- **Score Visualization**: Progress bars for opportunity scores
- **Quick Stats**: Real-time statistics on filtered results

### Technical Implementation
- **No Backend**: Uses local JSON file via fetch API
- **No Build Process**: Pure HTML/CSS/JS - works out of the box
- **Responsive Design**: Works on desktop and mobile devices
- **NLP Concepts**: Simple keyword matching with multiple field support

## File Structure

```
nlp_component/
├── index.html          # Main HTML file with all functionality
├── README.md           # This file
└── (future files)      # CSS, JS when backend is ready

Builderz07/
├── reseaux_chaleur.json   # Data file (required)
└── ...
```

## Data Fields Used

The component uses the following fields from the JSON data:

- `nom_reseau`: Network name
- `communes`: Cities covered
- `departement`: Department
- `region`: Region
- `MO`: Maître d'Ouvrage
- `Gestionnaire`: Network manager
- `echeance`: Contract deadline
- `confiance`: Confidence level (confirmee_boamp, confirmee_ted, estimee, inconnue)
- `score_opportunite`: Opportunity score (0-1)
- `boamp_montant`: Contract amount
- `titulaire_est_engie`: Whether ENGIE is the current holder

## Limitations (Local-Only Mode)

1. **No Backend**: All data processing happens in the browser
2. **Read-Only**: Cannot save changes or modifications
3. **No Advanced NLP**: Uses simple keyword matching (real NLP will come with backend)
4. **File Size**: Large JSON file may take a moment to load

## Future Enhancements (When Backend is Ready)

- [ ] Real NLP processing (entity recognition, semantic search)
- [ ] API integration for dynamic data loading
- [ ] User authentication and saved searches
- [ ] Advanced filtering and analytics
- [ ] Data export capabilities
- [ ] Real-time updates

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Recommended |
| Firefox | ✅ Full | Works great |
| Edge | ✅ Full | Chromium-based |
| Safari | ✅ Full | macOS/iOS |
| Mobile | ✅ Partial | Some UI adjustments needed |

## Troubleshooting

### "Failed to load JSON data"
- Ensure `reseaux_chaleur.json` exists in the parent directory
- Check file permissions
- If using local file server, ensure CORS is not blocking (most simple servers work fine)

### "No results found"
- Try clearing all filters
- Check that the search query is not too specific
- Verify the JSON data contains entries

### Slow loading
- The JSON file is ~800KB, which may take a moment on slower connections
- Consider using a local server for development

## Integration with Builder 4

When the backend is ready, this component can be integrated by:

1. Replace the local fetch call with API calls to the backend
2. Add proper NLP processing via backend services
3. Implement authentication
4. Add data mutation capabilities

## License

This component is part of the Builderz07 hackathon project.
