package system

import (
	"time"

	"github.com/google/uuid"
)

type RealClock struct{}

func NewRealClock() *RealClock {
	return &RealClock{}
}

func (c *RealClock) Now() time.Time {
	return time.Now().UTC()
}

type UUIDGen struct{}

func NewUUIDGen() *UUIDGen {
	return &UUIDGen{}
}

func (g *UUIDGen) NewUUID() uuid.UUID {
	id, err := uuid.NewV7()
	if err != nil {
		return uuid.New()
	}
	return id
}
