use crate::*;

impl SuperPremium {
    pub fn assert_owner(&self) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner_id,
            "ERR_NO_ACCESS"
        );
    }

    pub fn assert_subscription(&self, subscription_name: &SubscriptionName) {
        assert!(
            self.subscriptions.get(subscription_name).is_some(),
            "ERR_NO_SUBSCRIPTION"
        )
    }
}

#[derive(Clone)]
#[near(serializers=[borsh, json])]
pub struct FeeFraction {
    pub numerator: u32,
    pub denominator: u32,
}

impl FeeFraction {
    pub fn assert_valid(&self) {
        assert_ne!(self.denominator, 0, "Denominator must be a positive number");
        assert!(
            self.numerator <= self.denominator,
            "The fee must be less or equal to 1"
        );
    }

    pub fn multiply(&self, value: NearToken) -> NearToken {
        NearToken::from_yoctonear(
            (U256::from(self.numerator) * U256::from(value.as_yoctonear())
                / U256::from(self.denominator))
            .as_u128(),
        )
    }
}
