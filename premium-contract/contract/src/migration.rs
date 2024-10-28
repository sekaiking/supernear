use crate::*;

#[near]
impl SuperPremium {
    #[private]
    #[init(ignore_state)]
    #[allow(dead_code)]
    pub fn migrate(referral_fee: FeeFraction, premium_referral_fee: FeeFraction) -> Self {
        referral_fee.assert_valid();
        premium_referral_fee.assert_valid();

        #[near(serializers=[borsh])]
        struct OldContract {
            owner_id: AccountId,
            subscriptions: UnorderedMap<SubscriptionName, VSubscription>,
            deposits: NearToken,
            operations: u64,
        }

        let old_contract: OldContract = env::state_read().expect("Old state doesn't exist");

        Self {
            owner_id: old_contract.owner_id,
            subscriptions: old_contract.subscriptions,
            deposits: old_contract.deposits,
            operations: old_contract.operations,
            referrals: UnorderedMap::new(StorageKey::Referrals),
            referral_fee,
            premium_referral_fee,
            referral_rewards: LookupMap::new(StorageKey::ReferralRewards),
            total_referral_rewards: NearToken::from_yoctonear(0),
            account_subscriptions: LookupMap::new(StorageKey::AccountSubscriptions),
        }
    }
}
