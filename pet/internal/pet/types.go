package pet

type Mood string
type Personality string

const (
	MoodGrumpy  Mood = "sad"
	MoodNeutral Mood = "neutral"
	MoodGolden  Mood = "golden"
)

const (
	PersSupportive Personality = "supportive"
	PersSarcastic  Personality = "sarcastic"
	PersChill      Personality = "chill"
)

type PetState struct {
	Mood              Mood        `json:"mood"`
	Personality       Personality `json:"personality"`
	CompletionRate    float64     `json:"completionRate"`
	TotalInteractions int64       `json:"totalInteractions"`
}

type BrainInput struct {
	UserMessage string   `json:"userMessage"`
	State       PetState `json:"state"`
	// later: you can add time, upcoming events, etc.
}

type BrainOutput struct {
	NewState PetState `json:"newState"`
	Reply    string   `json:"reply"`
}

// The interface your app will use
type Brain interface {
	Respond(input BrainInput) (BrainOutput, error)
}
