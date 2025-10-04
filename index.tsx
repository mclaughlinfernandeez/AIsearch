// FIX: Import React and ReactDOM to resolve undefined errors.
import React from 'react';
import ReactDOM from 'react-dom';
import { GoogleGenAI } from "@google/genai";

// Mock function to simulate fetching data from PACER API
const fetchFromPacerAPI = async (caseNumber, username, password) => {
    console.log("Simulating PACER API call for:", { caseNumber, username });
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (username === 'user' && password === 'pass') {
        // Return a sample case text on success
        return `Case Number: ${caseNumber}\n\nSUPREME COURT OF THE UNITED STATES\n\nSyllabus\n\nOBERGEFELL ET AL. v. HODGES, DIRECTOR, OHIO DEPARTMENT OF HEALTH, ET AL.\n\nCERTIORARI TO THE UNITED STATES COURT OF APPEALS FOR THE SIXTH CIRCUIT\n\nNo. 14–556. Argued April 28, 2015—Decided June 26, 2015\n\nMichigan, Kentucky, Ohio, and Tennessee define marriage as a union between one man and one woman. The petitioners, 14 same-sex couples and two men whose same-sex partners are deceased, filed suits in Federal District Courts in their home States, claiming that respondent state officials violated the Fourteenth Amendment by denying them the right to marry or to have marriages performed in another State given full recognition. Each District Court ruled in the petitioners’ favor, but the Sixth Circuit consolidated the cases and reversed. \n\nThe Court held in Loving v. Virginia, 388 U. S. 1, that marriage is one of the vital personal rights essential to the orderly pursuit of happiness by free men. The fundamental liberties protected by the Fourteenth Amendment’s Due Process Clause extend to certain personal choices central to individual dignity and autonomy, including intimate choices defining personal identity and beliefs. This Court’s cases and the Nation’s traditions make clear that marriage is a fundamental right. The right to marry is fundamental as a matter of history and tradition, but rights come not from ancient sources alone. They rise, too, from a better informed understanding of how constitutional imperatives define a liberty that remains urgent in our own time.`;
    } else {
        // Simulate an error
        throw new Error("Invalid PACER credentials or case not found.");
    }
};


const App = () => {
    const [caseText, setCaseText] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [isFetchingPacer, setIsFetchingPacer] = React.useState(false);
    const [briefContent, setBriefContent] = React.useState('');
    const [imageUrl, setImageUrl] = React.useState('');
    const [sources, setSources] = React.useState([]);
    const [error, setError] = React.useState('');
    const [pacerError, setPacerError] = React.useState('');
    const [loadingMessage, setLoadingMessage] = React.useState('');

    // PACER form state
    const [caseNumber, setCaseNumber] = React.useState('');
    const [pacerUsername, setPacerUsername] = React.useState('');
    const [pacerPassword, setPacerPassword] = React.useState('');

    const formatBrief = (text) => {
        const sections = ["Facts of the Case", "Procedural History", "Legal Issue(s) Presented", "Holding", "Rationale of the Court"];
        let formattedText = text;
        sections.forEach(section => {
            const regex = new RegExp(`(${section})`, 'gi');
            formattedText = formattedText.replace(regex, `<h3>$1</h3>`);
        });
        return { __html: formattedText.replace(/\n/g, '<br />') };
    };
    
    const handleFetchFromPacer = async () => {
        if (!caseNumber || !pacerUsername || !pacerPassword) {
            setPacerError('Please fill in all PACER fields.');
            return;
        }
        setIsFetchingPacer(true);
        setPacerError('');
        setError('');

        try {
            const fetchedText = await fetchFromPacerAPI(caseNumber, pacerUsername, pacerPassword);
            setCaseText(fetchedText);
        } catch (err) {
            setPacerError(err.message);
        } finally {
            setIsFetchingPacer(false);
        }
    };

    const handleGenerateBrief = async () => {
        if (!caseText.trim()) {
            setError('Please paste or fetch the case text before generating.');
            return;
        }
        setIsLoading(true);
        setError('');
        setPacerError('');
        setBriefContent('');
        setImageUrl('');
        setSources([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            // --- Text Generation (Streaming) ---
            setLoadingMessage('Generating case brief...');
            const briefPromise = (async () => {
                const prompt = `Analyze the following legal case text and generate a structured case brief, adhering to the standard format for U.S. federal and Supreme Court case briefs. The brief must include the following sections, clearly delineated: "Facts of the Case", "Procedural History", "Legal Issue(s) Presented", "Holding", and "Rationale of the Court".\n\nCASE TEXT:\n${caseText}`;
                const stream = await ai.models.generateContentStream({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });

                let fullText = '';
                for await (const chunk of stream) {
                    fullText += chunk.text;
                    setBriefContent(fullText);
                }
            })();

            // --- Image Generation ---
            setLoadingMessage('Creating conceptual fMRI...');
            const imagePromise = ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: 'A conceptual, abstract fMRI brain scan showing complex legal reasoning and decision-making processes. Stylized, scientific, and professional. Blue and orange glowing neural pathways on a dark background.',
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: '16:9',
                },
            }).then(response => {
                const base64ImageBytes = response.generatedImages[0].image.imageBytes;
                setImageUrl(`data:image/jpeg;base64,${base64ImageBytes}`);
            });

            // --- Semantic Scholar Search ---
            setLoadingMessage('Searching for scholarly articles...');
            const keywordsForSearch = caseText.split(' ').slice(0, 20).join(' '); // Use first 20 words as query
            const scholarPromise = fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(keywordsForSearch)}&limit=5&fields=title,url`)
                .then(res => res.json())
                .then(data => {
                    if (data.data) {
                        setSources(data.data);
                    }
                });

            await Promise.all([briefPromise, imagePromise, scholarPromise]);

        } catch (err) {
            console.error(err);
            setError('An error occurred while generating the brief. Please try again.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    return (
        <div className="container">
            <header>
                <h1>AI Case Brief Assistant</h1>
                <p>Fetch your case document directly from PACER or paste it below to generate a brief, find sources, and create a conceptual image.</p>
            </header>
            <main>
                <div className="card">
                    <div className="pacer-form">
                         <h3>Fetch Case from PACER</h3>
                         <div className="pacer-inputs">
                            <input type="text" placeholder="Case Number (e.g., 1:23-cv-01234)" value={caseNumber} onChange={e => setCaseNumber(e.target.value)} aria-label="Case Number" />
                            <input type="text" placeholder="PACER Username" value={pacerUsername} onChange={e => setPacerUsername(e.target.value)} aria-label="PACER Username" />
                            <input type="password" placeholder="PACER Password" value={pacerPassword} onChange={e => setPacerPassword(e.target.value)} aria-label="PACER Password" />
                         </div>
                        <button onClick={handleFetchFromPacer} disabled={isFetchingPacer}>
                            {isFetchingPacer ? 'Fetching...' : 'Fetch Document'}
                        </button>
                        <p className="pacer-disclaimer">Your credentials are used only for this session to fetch the document and are not stored. For demo, use 'user' / 'pass'.</p>
                        {pacerError && <p className="error-message">{pacerError}</p>}
                    </div>
                     <hr className="divider" />
                    <label htmlFor="case-text" style={{ fontWeight: '500' }}>Or Paste Case Document Here</label>
                    <textarea
                        id="case-text"
                        value={caseText}
                        onChange={(e) => setCaseText(e.target.value)}
                        placeholder="e.g., Marbury v. Madison, 5 U.S. 137 (1803)..."
                        aria-label="Case Document Text Area"
                    />
                    <button onClick={handleGenerateBrief} disabled={isLoading} className="generate-button">
                        {isLoading ? 'Generating...' : 'Generate Case Brief'}
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </div>

                {isLoading && (
                    <div className="card loader">
                        <div className="spinner"></div>
                        <p>{loadingMessage}</p>
                    </div>
                )}

                {(!isLoading && (briefContent || imageUrl || sources.length > 0)) && (
                    <div className="output-grid">
                        {briefContent && (
                            <div className="card brief-card">
                                <h2>Generated Case Brief</h2>
                                <div className="brief-content" dangerouslySetInnerHTML={formatBrief(briefContent)} />
                            </div>
                        )}
                        {imageUrl && (
                            <div className="card image-card">
                                <h3>Conceptual fMRI</h3>
                                <img src={imageUrl} alt="AI-generated fMRI of legal reasoning" />
                            </div>
                        )}
                        {sources.length > 0 && (
                            <div className="card sources-card">
                                <h3>Scholarly Sources</h3>
                                <ul className="sources-list">
                                    {sources.map(source => (
                                        <li key={source.paperId}>
                                            <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));