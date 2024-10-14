import { OpenAI } from 'openai';

const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

const categories = [
    {
        "id": 1,
        "name": "Utilities"
    },
    {
        "id": 2,
        "name": "Entertainment"
    },
    {
        "id": 3,
        "name": "Transportation"
    },
    {
        "id": 4,
        "name": "Healthcare"
    },
    {
        "id": 5,
        "name": "Insurance"
    },
    {
        "id": 6,
        "name": "Salaries and Wages"
    },
    {
        "id": 7,
        "name": "Marketing"
    },
    {
        "id": 8,
        "name": "Infrastructure"
    },
    {
        "id": 9,
        "name": "Inventory"
    },
    {
        "id": 10,
        "name": "Research and Development"
    },
    {
        "id": 11,
        "name": "Other"
    }
]


export async function extractExpense(receipt: string) {
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                "role": "system",
                "content": `Extract and return the following information in JSON format from the receipt: { date: date of expense(\"YYYY-MM-DD\"), amount: amount of receipt, description:  title of expense (super brief, put any supporting info in the notes), companyName: name of company issuing the expense, notes: any notes, category: return the corresponding category id from the list of categories: ${categories.map(category => `${category.id}: ${category.name}`).join(', ')} }. Only return the JSON object and nothing else.`
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": receipt
                        }
                    }
                ]
            },
        ],
        max_tokens: 300,
    });

    let result = response.choices[0]?.message?.content;
    if (result) {
        // Remove any markdown code block formatting
        result = result.replace(/```json|```/g, '').trim();
        try {
            return JSON.parse(result);
        } catch (error) {
            console.error("Error parsing JSON:", error);
            return null;
        }
    }
    return null;

}