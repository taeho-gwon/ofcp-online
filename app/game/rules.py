from dataclasses import dataclass

from app.game.hand import HandRank


@dataclass(frozen=True, slots=True)
class FantasyEntryRule:
    """탑 핸드가 (hand_rank, high_card >= min_high)을 만족하면 cards장으로 FL 진입."""

    hand_rank: HandRank
    min_high: int
    cards: int


@dataclass(frozen=True, slots=True)
class Ruleset:
    name: str

    # 보드 크기
    top_size: int
    middle_size: int
    bottom_size: int

    # 카드 분배
    first_turn_cards: int
    normal_turn_cards: int
    normal_turn_discards: int
    fantasy_board_size: int

    # 점수
    scoop_bonus: int
    foul_penalty: int

    # 매치 진행
    max_rounds: int  # 일반 라운드 한도 (보너스 라운드는 카운트 제외)
    starting_score: int  # 각 플레이어 시작 점수
    eliminate_at: int  # 이 점수 이하 도달 시 즉시 게임 종료

    # Royalty 테이블 (없으면 0)
    top_pair_royalty: dict[int, int]  # high(6..14) → 점수
    top_trips_royalty: dict[int, int]  # high(2..14) → 점수
    middle_royalty: dict[HandRank, int]
    bottom_royalty: dict[HandRank, int]

    # FantasyLand: 위에서부터 첫 매칭이 적용됨 (강한 조건을 먼저)
    fantasy_entry: tuple[FantasyEntryRule, ...]
    # FL 재진입: 탑이 top_min 이상 OR 바텀이 bottom_min 이상이면 cards장 재진입
    fantasy_reentry_top_min: HandRank
    fantasy_reentry_bottom_min: HandRank
    fantasy_reentry_cards: int


PINEAPPLE_OFC = Ruleset(
    name="pineapple",
    top_size=3,
    middle_size=5,
    bottom_size=5,
    first_turn_cards=5,
    normal_turn_cards=3,
    normal_turn_discards=1,
    fantasy_board_size=13,
    scoop_bonus=3,
    foul_penalty=3,
    max_rounds=12,
    starting_score=100,
    eliminate_at=0,
    top_pair_royalty={6: 1, 7: 2, 8: 3, 9: 4, 10: 5, 11: 6, 12: 7, 13: 8, 14: 9},
    top_trips_royalty={r: r - 2 + 10 for r in range(2, 15)},
    middle_royalty={
        HandRank.THREE_OF_A_KIND: 2,
        HandRank.STRAIGHT: 4,
        HandRank.FLUSH: 8,
        HandRank.FULL_HOUSE: 12,
        HandRank.FOUR_OF_A_KIND: 20,
        HandRank.STRAIGHT_FLUSH: 30,
        HandRank.ROYAL_FLUSH: 50,
    },
    bottom_royalty={
        HandRank.STRAIGHT: 2,
        HandRank.FLUSH: 4,
        HandRank.FULL_HOUSE: 6,
        HandRank.FOUR_OF_A_KIND: 10,
        HandRank.STRAIGHT_FLUSH: 15,
        HandRank.ROYAL_FLUSH: 25,
    },
    fantasy_entry=(
        FantasyEntryRule(HandRank.THREE_OF_A_KIND, min_high=2, cards=17),
        FantasyEntryRule(HandRank.ONE_PAIR, min_high=14, cards=16),
        FantasyEntryRule(HandRank.ONE_PAIR, min_high=13, cards=15),
        FantasyEntryRule(HandRank.ONE_PAIR, min_high=12, cards=14),
    ),
    fantasy_reentry_top_min=HandRank.THREE_OF_A_KIND,
    fantasy_reentry_bottom_min=HandRank.FOUR_OF_A_KIND,
    fantasy_reentry_cards=14,
)


RULESETS: dict[str, Ruleset] = {
    "pineapple": PINEAPPLE_OFC,
}
