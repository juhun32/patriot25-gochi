package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/juhun32/patriot25-gochi/go/api"
	"github.com/juhun32/patriot25-gochi/go/middleware"
	"github.com/juhun32/patriot25-gochi/go/repo"
)

type UserHandler struct {
	UserRepo *repo.UserRepo
}

func NewUserHandler(userRepo *repo.UserRepo) *UserHandler {
	return &UserHandler{
		UserRepo: userRepo,
	}
}

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(middleware.UserClaimsKey()).(*api.Claims)
	if !ok || claims == nil {
		http.Error(w, "missing auth claims", http.StatusUnauthorized)
		return
	}

	user, err := h.UserRepo.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, "failed to fetch user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}
