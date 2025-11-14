package middleware

import (
	"context"
	"net/http"

	"github.com/juhun32/patriot25-gochi/go/api"
)

type ctxKey string

const userClaimsKey ctxKey = "userClaims"

func UserClaimsKey() ctxKey {
	return userClaimsKey
}

func AuthMiddleware(secret string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("ppet_token")
		if err != nil || cookie.Value == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		claims, err := api.ParseAndValidateJWT(secret, cookie.Value)
		if err != nil {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), userClaimsKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// Helper to get userId in handlers
func GetUserID(r *http.Request) (string, bool) {
	v := r.Context().Value(userClaimsKey)
	if v == nil {
		return "", false
	}
	id, ok := v.(string)
	return id, ok
}
