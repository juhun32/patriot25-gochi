package models

type User struct {
	UserID    string `dynamodbav:"userId" json:"userId"`
	Email     string `dynamodbav:"email" json:"email"`
	Name      string `dynamodbav:"name" json:"name"`
	Picture   string `dynamodbav:"picture" json:"picture"`
	CreatedAt int64  `dynamodbav:"createdAt" json:"createdAt"`
	UpdatedAt int64  `dynamodbav:"updatedAt" json:"updatedAt"`
}
