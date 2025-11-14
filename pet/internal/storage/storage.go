package storage

import (
	"encoding/json"
	"errors"
	"os"

	"github.com/juhun32/patriot25-gochi/pet/internal/model"
	"github.com/juhun32/patriot25-gochi/pet/internal/pet"
)

func LoadState(path string) (model.AppState, error) {
	var state model.AppState

	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			state = model.AppState{
				Pet: pet.PetState{
					Mood:        pet.MoodNeutral,
					Personality: pet.PersChill,
				},
				Todos:      []model.Todo{},
				NextTodoID: 1,
			}
			return state, nil
		}
		return state, err
	}

	if err := json.Unmarshal(data, &state); err != nil {
		return state, err
	}
	return state, nil
}

func SaveState(path string, state model.AppState) error {
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}
