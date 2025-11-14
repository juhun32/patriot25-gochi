package models

type User struct {
	UserID    string `dynamodbav:"userId"`
	Email     string `dynamodbav:"email"`
	Name      string `dynamodbav:"name"`
	Picture   string `dynamodbav:"picture"`
	CreatedAt int64  `dynamodbav:"createdAt"`
	UpdatedAt int64  `dynamodbav:"updatedAt"`
}
