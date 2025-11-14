package model

import "github.com/juhun32/patriot25-gochi/pet/internal/pet"

type Todo struct {
	ID   int    `json:"id"`
	Text string `json:"text"`
	Done bool   `json:"done"`
}

type AppState struct {
	Pet        pet.PetState `json:"pet"`
	Todos      []Todo       `json:"todos"`
	NextTodoID int          `json:"nextTodoId"`
}
