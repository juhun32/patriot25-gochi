package main

import (
	"context"
	"log"
	"net/http"

	"github.com/juhun32/patriot25-gochi/go/api"
	"github.com/juhun32/patriot25-gochi/go/aws"
	"github.com/juhun32/patriot25-gochi/go/google"
	"github.com/juhun32/patriot25-gochi/go/route"
)

func main() {
	ctx := context.Background()

	cfg := api.Load()
	dynamo := aws.NewDynamo(ctx, cfg.AWSRegion)

	googleClient := google.New(cfg.GoogleClientID, cfg.GoogleClientSecret, cfg.GoogleRedirectURL)
	userRepo := api.NewUserRepo(dynamo.Client, cfg.UsersTable)
	authHandler := api.NewAuthHandler(googleClient, userRepo)

	router := route.NewRouter(authHandler)

	addr := ":8080"
	log.Println("Server listening on", addr)

	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatal(err)
	}
}
