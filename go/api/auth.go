package api

import (
	"context"
	"fmt"
	"net/http"

	"github.com/juhun32/patriot25-gochi/go/google"
	"github.com/juhun32/patriot25-gochi/go/models"
)

type AuthHandler struct {
	Google   *google.GoogleOAuth
	UserRepo *UserRepo
}

func NewAuthHandler(google *google.GoogleOAuth, userRepo *UserRepo) *AuthHandler {
	return &AuthHandler{
		Google:   google,
		UserRepo: userRepo,
	}
}

// In real apps, you should generate & verify state to prevent CSRF.
// For hackathon, we keep it simple.
func (h *AuthHandler) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	state := "random-state" // TODO: generate & store in cookie/session
	url := h.Google.AuthCodeURL(state)
	http.Redirect(w, r, url, http.StatusFound)
}

func (h *AuthHandler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	// Check error from Google
	if errMsg := r.URL.Query().Get("error"); errMsg != "" {
		http.Error(w, "Google error: "+errMsg, http.StatusBadRequest)
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "missing code", http.StatusBadRequest)
		return
	}

	userInfo, _, err := h.Google.GetUserInfo(ctx, code)
	if err != nil {
		http.Error(w, "failed to get userinfo: "+err.Error(), http.StatusInternalServerError)
		return
	}

	user := &models.User{
		UserID:  userInfo.Sub,
		Email:   userInfo.Email,
		Name:    userInfo.Name,
		Picture: userInfo.Picture,
	}

	if err := h.UserRepo.UpsertUser(ctx, user); err != nil {
		http.Error(w, "failed to save user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// TODO: set your own session / JWT here.
	// For now, just respond with user info (for debugging)
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(fmt.Sprintf(`{"userId":"%s","email":"%s","name":"%s"}`, user.UserID, user.Email, user.Name)))
}
