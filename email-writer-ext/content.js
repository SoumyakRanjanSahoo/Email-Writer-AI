console.log("Email Writer Extension - Content Script Loading");

function createAIButton() {
    const btn = document.createElement('div');

    // Match Gmail's Send button styles
    btn.className = 'T-I J-J5-Ji aoO v7 T-I-atl L3'; 
    btn.style.marginRight = '8px';
    btn.style.backgroundColor = '#0a57d1'; // Gmail blue
    btn.style.color = '#fff';
    btn.style.fontWeight = '500';
    btn.style.textTransform = 'none';
    btn.style.height = '36px';
    btn.style.lineHeight = '36px';
    btn.style.padding = '0 16px';
    btn.style.borderRadius = '18px';
    btn.style.cursor = 'pointer';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';

    btn.innerHTML = 'AI Reply';
    btn.setAttribute('role', 'button');
    btn.setAttribute('data-tooltip', 'Generate AI Reply');

    // Hover effect like Gmail's button
    btn.addEventListener('mouseenter', () => {
        btn.style.backgroundColor = '#1765cc';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.backgroundColor = '#1a73e8';
    });

    return btn;
}


function findComposeToolbar() {
    // Try popup compose first, then inline reply
    const selectors = [
        '[role="dialog"] .aDh',                // popup compose toolbar
        '.btC .aDh',                            // inline reply toolbar
        '[aria-label="Formatting options"]',    // fallback for popup
        '.btC'                                  // fallback for inline
    ];
    for (const selector of selectors) {
        const toolbar = document.querySelector(selector);
        if (toolbar) {
            console.log("Toolbar found using selector:", selector);
            return toolbar;
        }
    }
    return null;
}

function getEmailContent() {
    const selectors = [
        '.h7', '.a3s.aiL', '.gmail_quote', '[role="presentation"]'
    ];
    for (const selector of selectors) {
        const content = document.querySelector(selector);
        if (content) {
            return content.innerText.trim();
        }
    }
    return '';
}

function injectButton() {
    const existingButton = document.querySelector('.ai-reply-button');
    if (existingButton) existingButton.remove();

    const toolbar = findComposeToolbar();
    if (!toolbar) {
        console.log("Toolbar not found");
        return;
    }

    console.log("Toolbar found, creating AI button");

    const button = createAIButton(); // ✅ Declare before usage
    button.classList.add('ai-reply-button');

    button.addEventListener('click', async () => {
        try {
            button.innerHTML = 'Generating...';
            button.style.pointerEvents = 'none';

            const emailContent = getEmailContent();
            const response = await fetch('http://localhost:8080/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    emailContent: emailContent,
                    tone: "professional"
                })
            });

            if (!response.ok) throw new Error('API Request Failed');

            const generatedReply = await response.text();
            const composeBox = document.querySelector('[role="textbox"][g_editable="true"]');

            if (composeBox) {
                composeBox.focus();
                document.execCommand('insertText', false, generatedReply);
            } else {
                console.error('Compose box not found');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to generate reply');
        } finally {
            button.innerHTML = 'AI Reply';
            button.style.pointerEvents = 'auto';
        }
    });

    // Placement: popup vs inline
    if (toolbar.closest('[role="dialog"]')) {
        toolbar.parentElement.insertBefore(button, toolbar.nextSibling);
    } else {
        toolbar.insertBefore(button, toolbar.firstChild);
    }
}

const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        const addedNodes = Array.from(mutation.addedNodes);
        const hasComposeElements = addedNodes.some(node =>
            node.nodeType === Node.ELEMENT_NODE &&
            (node.matches('.aDh, .btC, [role="dialog"]') ||
             node.querySelector('.aDh, .btC, [role="dialog"]'))
        );
        if (hasComposeElements) {
            console.log("Compose window detected");
            setTimeout(injectButton, 500);
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
